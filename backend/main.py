from fastapi import FastAPI, HTTPException, Header
from fastapi.middleware.cors import CORSMiddleware
from datetime import datetime, date
from typing import List, Optional
import os

from models import (
    AgentSignal, CreatorAlert, DeadlineItem, MarketOpportunity,
    PatternDetection, HealthResponse
)
from database import db

app = FastAPI(
    title="Creator Aggregator API",
    description="Ingest agent signals, serve creator alerts and market opportunities",
    version="1.1.0"
)

# CORS for Vercel frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

API_KEY = os.getenv("API_KEY", "dev-key-change-me")

# --- Health ---
@app.get("/api/v1/health", response_model=HealthResponse)
async def health_check():
    return HealthResponse(
        status="ok",
        version="1.1.0",
        database="sqlite-local",
        signal_count=db.get_signal_count(),
        last_ingestion=db.get_last_ingestion()
    )

# --- Signal Ingestion ---
@app.post("/api/v1/signals/ingest")
async def ingest_signal(signal: AgentSignal, x_api_key: Optional[str] = Header(None)):
    if x_api_key != API_KEY and API_KEY != "dev-key-change-me":
        raise HTTPException(status_code=401, detail="Invalid API key")
    
    payload = signal.model_dump()
    success = db.insert_signal(payload)
    if not success:
        raise HTTPException(status_code=500, detail="Database insert failed")
    
    return {"status": "ingested", "signal_id": signal.signal_id}

@app.post("/api/v1/signals/batch")
async def ingest_batch(signals: List[AgentSignal], x_api_key: Optional[str] = Header(None)):
    if x_api_key != API_KEY and API_KEY != "dev-key-change-me":
        raise HTTPException(status_code=401, detail="Invalid API key")
    
    ingested = []
    failed = []
    for signal in signals:
        payload = signal.model_dump()
        if db.insert_signal(payload):
            ingested.append(signal.signal_id)
        else:
            failed.append(signal.signal_id)
    
    return {"ingested": ingested, "failed": failed, "count": len(ingested)}

# --- Archive / Latest ---
@app.get("/api/v1/archive/latest")
async def get_latest_archive(limit: int = 50):
    signals = db.get_signals(limit=limit)
    return {"signals": signals, "count": len(signals)}

# --- Creator Views ---
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
                except:
                    pass
    
    deadlines.sort(key=lambda d: d.days_remaining)
    return deadlines

# --- Market / Builder Views ---
@app.get("/api/v1/market/opportunities", response_model=List[MarketOpportunity])
async def get_opportunities():
    signals = db.get_signals(limit=100)
    opportunities = []
    seen = set()
    
    for sig in signals:
        market = sig.get("market_intelligence", {})
        for consol in market.get("consolidation_signals", []):
            key = consol.get("pattern", "")
            if key not in seen:
                seen.add(key)
                opportunities.append(MarketOpportunity(
                    opportunity_id=f"opp_{key.replace(' ', '_')}",
                    pattern_name=consol.get("pattern", ""),
                    regions_affected=consol.get("regions_affected", []),
                    description=consol.get("description", ""),
                    product_opportunity=consol.get("product_opportunity", ""),
                    urgency=consol.get("urgency", "medium"),
                    data_gaps=[],
                    first_detected=consol.get("first_detected", sig.get("date", "")),
                    trend_direction=consol.get("trend_direction", "stable")
                ))
        
        for arb in market.get("arbitrage_signals", []):
            key = arb.get("opportunity", "")
            if key not in seen:
                seen.add(key)
                opportunities.append(MarketOpportunity(
                    opportunity_id=f"arb_{key.replace(' ', '_')[:30]}",
                    pattern_name=arb.get("description", "")[:50],
                    regions_affected=arb.get("regions_affected", []),
                    description=arb.get("description", ""),
                    product_opportunity=arb.get("opportunity", ""),
                    urgency="medium",
                    data_gaps=[arb.get("data_gap")] if arb.get("data_gap") else [],
                    first_detected=sig.get("date", ""),
                    trend_direction="stable"
                ))
    
    return opportunities

@app.get("/api/v1/market/patterns", response_model=List[PatternDetection])
async def get_patterns():
    signals = db.get_signals(limit=100)
    patterns = {}
    
    for sig in signals:
        market = sig.get("market_intelligence", {})
        for consol in market.get("consolidation_signals", []):
            pat = consol.get("pattern", "")
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

# --- Stats ---
@app.get("/api/v1/stats")
async def get_stats():
    signals = db.get_signals(limit=1000)
    regions = set()
    cohorts = set()
    severities = {"critical": 0, "high": 0, "medium": 0, "low": 0, "observational": 0}
    
    for sig in signals:
        cohorts.add(sig.get("cohort", "unknown"))
        for intel in sig.get("creator_intelligence", []):
            regions.add(intel.get("region", ""))
            sev = intel.get("severity", "low")
            severities[sev] = severities.get(sev, 0) + 1
    
    return {
        "total_signals": len(signals),
        "regions_covered": len(regions),
        "cohorts": list(cohorts),
        "severity_distribution": severities,
        "last_ingestion": db.get_last_ingestion()
    }

# --- Root redirect ---
@app.get("/")
async def root():
    return {"message": "Creator Aggregator API v1.1.0", "docs": "/docs"}