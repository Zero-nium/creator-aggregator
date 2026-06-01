import hashlib
import os
import re
import time
from collections import defaultdict
from datetime import date, datetime
from typing import List, Optional

from fastapi import FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from api_keys import verify_key
from database import db
from models import (
    AgentSignal, CreatorAlert, DeadlineItem, HealthResponse,
    MarketOpportunity, PatternDetection
)

# ═══════════════════════════════════════════════════════════════
# APP
# ═══════════════════════════════════════════════════════════════

app = FastAPI(
    title="Creator Aggregator API",
    description="Ingest agent signals, serve creator alerts and market opportunities",
    version="1.3.0"
)

# CORS for Vercel frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ═══════════════════════════════════════════════════════════════
# AUTH — Uses api_keys.py (Turso-backed, no env vars needed)
# ═══════════════════════════════════════════════════════════════

def _verify_cohort_key(cohort: str, key: Optional[str]) -> bool:
    """Validate x-api-key against the api_keys table. Strict cohort matching."""
    if not key:
        return False
    result = verify_key(key)
    if not result:
        return False
    return result["cohort"] == cohort

# ═══════════════════════════════════════════════════════════════
# RATE LIMITING — In-memory per swarm_id (PoC; replace with Redis later)
# ═══════════════════════════════════════════════════════════════

_rate_limits: defaultdict[str, List[float]] = defaultdict(list)

DEFAULT_MAX_PER_HOUR = int(os.getenv("RATE_LIMIT_PER_HOUR", "10"))
RATE_WINDOW_SECONDS = 3600

def _check_rate_limit(swarm_id: str, max_per_hour: int = DEFAULT_MAX_PER_HOUR) -> bool:
    """Return True if swarm is within rate limit, else False."""
    now = time.time()
    window = _rate_limits[swarm_id]
    cutoff = now - RATE_WINDOW_SECONDS
    while window and window[0] < cutoff:
        window.pop(0)
    if len(window) >= max_per_hour:
        return False
    window.append(now)
    return True

# ═══════════════════════════════════════════════════════════════
# CONTENT VALIDATION — Lightweight guards against garbage / malicious data
# ═══════════════════════════════════════════════════════════════

_SIGNAL_ID_RE = re.compile(r'^sig_\d{4}_\d{2}_\d{2}_[a-z]+_[a-z]+_\d{3}$')

# Expanded valid signal types for new taxonomy
_VALID_SIGNAL_TYPES = {
    "regulatory_enforcement", "platform_policy", "compliance_deadline",
    "media_escalation", "creator_sentiment", "baseline",
    "monetization_change", "algorithm_shift", "audience_trend",
    "engagement_pattern", "commercial_opportunity", "content_zeitgeist",
    "platform_feature", "competitive_threat",
}

def _validate_signal(signal: AgentSignal) -> None:
    """Raise HTTPException(422) if signal fails soft content checks."""

    # 1. signal_id format
    if not _SIGNAL_ID_RE.match(signal.signal_id):
        raise HTTPException(
            status_code=422,
            detail="signal_id format invalid. Expected: sig_YYYY_MM_DD_cohort_region_001"
        )

    # 2. date within acceptable window (last 7 days, max 1 day future)
    try:
        sig_date = datetime.strptime(signal.date, "%Y-%m-%d").date()
        today = date.today()
        days_old = (today - sig_date).days
        days_future = (sig_date - today).days
        if days_old > 7 or days_future > 1:
            raise HTTPException(
                status_code=422,
                detail=f"date {signal.date} out of range (max 7 days old, 1 day future)"
            )
    except ValueError:
        raise HTTPException(status_code=422, detail="date format invalid (expected YYYY-MM-DD)")

    # 3. minimum creator intelligence
    if not signal.creator_intelligence:
        raise HTTPException(status_code=422, detail="creator_intelligence cannot be empty")

    # 4. every intel item needs at least one source
    for idx, intel in enumerate(signal.creator_intelligence):
        if not intel.sources:
            raise HTTPException(
                status_code=422,
                detail=f"creator_intelligence[{idx}] must have at least one source"
            )
        # 4b. validate signal_type is known
        if intel.signal_type not in _VALID_SIGNAL_TYPES:
            raise HTTPException(
                status_code=422,
                detail=f"creator_intelligence[{idx}] has unknown signal_type: {intel.signal_type}"
            )

    # 5. narrative length (catches low-effort / spam)
    if len(signal.narrative.strip()) < 50:
        raise HTTPException(status_code=422, detail="narrative too short (min 50 chars)")

    # 6. cohort must be known (validated against api_keys table)
    # verify_key already ensures cohort exists in DB, so this is implicit

# ═══════════════════════════════════════════════════════════════
# HEALTH
# ═══════════════════════════════════════════════════════════════

@app.get("/api/v1/health", response_model=HealthResponse)
async def health_check():
    db.get_signal_count()
    return HealthResponse(
        status="ok",
        version="1.3.0",
        database="turso" if db._client else "sqlite-local",
        signal_count=db.get_signal_count(),
        last_ingestion=db.get_last_ingestion()
    )

# ═══════════════════════════════════════════════════════════════
# SIGNAL INGESTION — Single + Batch
# ═══════════════════════════════════════════════════════════════

@app.post("/api/v1/signals/ingest")
async def ingest_signal(signal: AgentSignal, x_api_key: Optional[str] = Header(None)):
    # Auth
    if not _verify_cohort_key(signal.cohort, x_api_key):
        raise HTTPException(status_code=401, detail="Invalid cohort API key")

    # Rate limit
    if not _check_rate_limit(signal.swarm_id):
        raise HTTPException(status_code=429, detail="Rate limit exceeded for this swarm")

    # Content validation
    _validate_signal(signal)

    # Insert (idempotent via INSERT OR REPLACE on signal_id)
    payload = signal.model_dump()
    success = db.insert_signal(payload)
    if not success:
        raise HTTPException(status_code=500, detail="Database insert failed")

    return {"status": "ingested", "signal_id": signal.signal_id}

@app.post("/api/v1/signals/batch")
async def ingest_batch(signals: List[AgentSignal], x_api_key: Optional[str] = Header(None)):
    """Ingest multiple signals in one request. Max 10 per batch."""
    if len(signals) > 10:
        raise HTTPException(status_code=422, detail="Batch max 10 signals")

    ingested = []
    failed = []

    for signal in signals:
        # Auth per signal (cohort may vary within batch, but key must match each)
        if not _verify_cohort_key(signal.cohort, x_api_key):
            failed.append({"signal_id": signal.signal_id, "reason": "Invalid cohort API key"})
            continue

        # Rate limit per swarm
        if not _check_rate_limit(signal.swarm_id):
            failed.append({"signal_id": signal.signal_id, "reason": "Rate limit exceeded"})
            continue

        # Validation
        try:
            _validate_signal(signal)
        except HTTPException as e:
            failed.append({"signal_id": signal.signal_id, "reason": e.detail})
            continue

        # Insert
        payload = signal.model_dump()
        if db.insert_signal(payload):
            ingested.append(signal.signal_id)
        else:
            failed.append({"signal_id": signal.signal_id, "reason": "Database insert failed"})

    return {
        "ingested": ingested,
        "failed": failed,
        "count": len(ingested),
        "total": len(signals)
    }

# ═══════════════════════════════════════════════════════════════
# ARCHIVE / LATEST
# ═══════════════════════════════════════════════════════════════

@app.get("/api/v1/archive/latest")
async def get_latest_archive(limit: int = 50):
    signals = db.get_signals(limit=limit)
    return {"signals": signals, "count": len(signals)}

# ═══════════════════════════════════════════════════════════════
# CREATOR VIEWS
# ═══════════════════════════════════════════════════════════════

@app.get("/api/v1/creator/alerts", response_model=List[CreatorAlert])
async def get_creator_alerts(severity: Optional[str] = None, region: Optional[str] = None):
    signals = db.get_signals(limit=100)
    alerts = []

    for sig in signals:
        for intel in sig.get("creator_intelligence", []):
            sev = intel.get("severity", "low")
            reg = intel.get("region", "")

            if severity and sev != severity:
                continue
            if region and region.lower() not in reg.lower():
                continue

            alerts.append(CreatorAlert(
                alert_id=f"{sig['signal_id']}_{reg}",
                severity=sev,
                region=reg,
                headline=intel.get("headline", ""),
                action=intel.get("creator_action", ""),
                deadline=intel.get("deadline"),
                content_formats=intel.get("content_format_at_risk", []),
                sources=[s["name"] for s in intel.get("sources", [])]
            ))

    severity_order = {"critical": 0, "high": 1, "medium": 2, "low": 3, "observational": 4}
    alerts.sort(key=lambda a: severity_order.get(a.severity, 99))
    return alerts

@app.get("/api/v1/creator/deadlines", response_model=List[DeadlineItem])
async def get_deadlines():
    signals = db.get_signals(limit=100)
    deadlines = []
    today = date.today()

    for sig in signals:
        for intel in sig.get("creator_intelligence", []):
            if intel.get("deadline"):
                try:
                    deadline_date = datetime.strptime(intel["deadline"], "%Y-%m-%d").date()
                    days_remaining = (deadline_date - today).days

                    deadlines.append(DeadlineItem(
                        deadline_id=f"{sig['signal_id']}_{intel['region']}",
                        date=intel["deadline"],
                        region=intel["region"],
                        headline=intel.get("headline", ""),
                        action_required=intel.get("creator_action", ""),
                        days_remaining=days_remaining,
                        severity=intel.get("severity", "medium")
                    ))
                except Exception:
                    pass

    deadlines.sort(key=lambda d: d.days_remaining)
    return deadlines

# ═══════════════════════════════════════════════════════════════
# MARKET / BUILDER VIEWS — Graceful degradation: build_signals preferred, legacy fallback
# ═══════════════════════════════════════════════════════════════

@app.get("/api/v1/market/opportunities", response_model=List[MarketOpportunity])
async def get_opportunities():
    signals = db.get_signals(limit=100)
    opportunities = []
    seen = set()

    for sig in signals:
        market = sig.get("market_intelligence", {})

        # --- NEW: build_signals (preferred) ---
        for build in market.get("build_signals", []):
            key = build.get("pattern_name", "")
            if not key or key in seen:
                continue
            seen.add(key)
            opportunities.append(MarketOpportunity(
                opportunity_id=f"opp_{key.replace(' ', '_')}",
                pattern_name=build.get("pattern_name", ""),
                regions_affected=build.get("regions_affected", []),
                description=build.get("description", ""),
                product_opportunity=build.get("product_opportunity", ""),
                solution=build.get("solution"),
                commercialisation=build.get("commercialisation"),
                urgency=build.get("urgency", "medium"),
                data_gaps=[],
                first_detected=build.get("first_detected", sig.get("date", "")),
                trend_direction=build.get("trend_direction", "stable"),
                solo_builder_score=build.get("solo_builder_score"),
                stack_suggestion=build.get("stack_suggestion"),
                validation_path=build.get("validation_path"),
            ))

        # --- LEGACY: consolidation_signals (backward compatibility) ---
        for consol in market.get("consolidation_signals", []):
            key = consol.get("pattern", "")
            if not key or key in seen:
                continue
            seen.add(key)
            opportunities.append(MarketOpportunity(
                opportunity_id=f"opp_{key.replace(' ', '_')}",
                pattern_name=consol.get("pattern", ""),
                regions_affected=consol.get("regions_affected", []),
                description=consol.get("description", ""),
                product_opportunity=consol.get("product_opportunity", ""),
                solution=consol.get("solution"),
                commercialisation=consol.get("commercialisation"),
                urgency=consol.get("urgency", "medium"),
                data_gaps=[],
                first_detected=consol.get("first_detected", sig.get("date", "")),
                trend_direction=consol.get("trend_direction", "stable"),
            ))

        # --- LEGACY: arbitrage_signals (backward compatibility) ---
        for arb in market.get("arbitrage_signals", []):
            key = arb.get("opportunity", "")
            if not key or key in seen:
                continue
            seen.add(key)
            opportunities.append(MarketOpportunity(
                opportunity_id=f"arb_{key.replace(' ', '_')[:30]}",
                pattern_name=arb.get("description", "")[:50],
                regions_affected=arb.get("regions_affected", []),
                description=arb.get("description", ""),
                product_opportunity=arb.get("opportunity", ""),
                solution=None,
                commercialisation=None,
                urgency="medium",
                data_gaps=[arb.get("data_gap")] if arb.get("data_gap") else [],
                first_detected=sig.get("date", ""),
                trend_direction="stable",
            ))

    return opportunities

@app.get("/api/v1/market/patterns", response_model=List[PatternDetection])
async def get_patterns():
    signals = db.get_signals(limit=100)
    patterns = {}

    for sig in signals:
        market = sig.get("market_intelligence", {})

        # New build_signals
        for build in market.get("build_signals", []):
            pat = build.get("pattern_name", "")
            if not pat:
                continue
            if pat not in patterns:
                patterns[pat] = {
                    "regions": set(),
                    "signals": [],
                    "first_detected": build.get("first_detected", sig.get("date", "")),
                    "trend_direction": build.get("trend_direction", "stable")
                }
            patterns[pat]["regions"].update(build.get("regions_affected", []))
            patterns[pat]["signals"].append(sig["signal_id"])

        # Legacy consolidation_signals
        for consol in market.get("consolidation_signals", []):
            pat = consol.get("pattern", "")
            if not pat:
                continue
            if pat not in patterns:
                patterns[pat] = {
                    "regions": set(),
                    "signals": [],
                    "first_detected": consol.get("first_detected", sig.get("date", "")),
                    "trend_direction": consol.get("trend_direction", "stable")
                }
            patterns[pat]["regions"].update(consol.get("regions_affected", []))
            patterns[pat]["signals"].append(sig["signal_id"])

    return [
        PatternDetection(
            pattern_id=f"pat_{p.replace(' ', '_')}",
            pattern=p,
            regions=list(data["regions"]),
            event_count=len(data["signals"]),
            first_detected=data["first_detected"],
            trend_direction=data["trend_direction"],
            signals=data["signals"]
        )
        for p, data in patterns.items()
    ]

# ═══════════════════════════════════════════════════════════════
# STATS
# ═══════════════════════════════════════════════════════════════

@app.get("/api/v1/stats")
async def get_stats():
    signals = db.get_signals(limit=1000)
    regions = set()
    cohorts = set()
    severities = {"critical": 0, "high": 0, "medium": 0, "low": 0, "observational": 0}
    signal_types = defaultdict(int)

    for sig in signals:
        cohorts.add(sig.get("cohort", "unknown"))
        for intel in sig.get("creator_intelligence", []):
            regions.add(intel.get("region", ""))
            sev = intel.get("severity", "low")
            severities[sev] = severities.get(sev, 0) + 1
            st = intel.get("signal_type", "unknown")
            signal_types[st] += 1

    return {
        "total_signals": len(signals),
        "regions_covered": len(regions),
        "cohorts": list(cohorts),
        "severity_distribution": severities,
        "signal_type_distribution": dict(signal_types),
        "last_ingestion": db.get_last_ingestion()
    }

# ═══════════════════════════════════════════════════════════════
# ROOT REDIRECT
# ═══════════════════════════════════════════════════════════════

@app.get("/")
async def root():
    return {"message": "Creator Aggregator API v1.3.0", "docs": "/docs"}
