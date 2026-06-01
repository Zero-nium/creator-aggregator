from pydantic import BaseModel, Field
from typing import List, Optional, Literal
from datetime import datetime

# --- Core Signal ---
class SignalSource(BaseModel):
    name: str
    url: Optional[str] = None
    date_accessed: str
    source_type: Literal["government", "news", "platform", "social", "industry", "analytics", "creator_tool"] = "government"

class CreatorIntelligence(BaseModel):
    region: str
    signal_type: Literal[
        # Legacy — still valid for backward compatibility
        "regulatory_enforcement", "platform_policy", "compliance_deadline",
        "media_escalation", "creator_sentiment", "baseline",
        # New — engagement & commercial focus
        "monetization_change",      # Revenue model shifts, fund launches, payout thresholds
        "algorithm_shift",          # Feed/discovery changes, recommendation updates
        "audience_trend",           # Demographic shifts, platform migration, format adoption
        "engagement_pattern",       # Like/comment/sub anomalies, viral mechanics
        "commercial_opportunity",   # Brand partnerships, affiliate launches, sponsorship trends
        "content_zeitgeist",        # Format waves, meme lifecycles, aesthetic trends
        "platform_feature",         # New tools, beta programs, API changes, shopping integrations
        "competitive_threat",       # New entrants, incumbent moves, exclusivity deals
    ]
    severity: Literal["critical", "high", "medium", "low", "observational"]
    headline: str
    what_changed: str
    creator_risk: str
    creator_action: str
    content_format_at_risk: List[str] = Field(default_factory=list)
    deadline: Optional[str] = None
    sources: List[SignalSource]
    cross_references: List[str] = Field(default_factory=list)

# --- Legacy Builder Signals (backward compatibility) ---
class ConsolidationSignal(BaseModel):
    pattern: str
    regions_affected: List[str]
    description: str
    product_opportunity: str
    solution: Optional[str] = None
    commercialisation: Optional[str] = None
    urgency: Literal["critical", "high", "medium", "low"]
    first_detected: str
    event_count: int
    trend_direction: Literal["strengthening", "weakening", "stable"]

class ArbitrageSignal(BaseModel):
    description: str
    opportunity: str
    data_gap: Optional[str] = None
    regions_affected: List[str] = Field(default_factory=list)

# --- New Builder Signal (agentic/solo-builder focus) ---
class BuildSignal(BaseModel):
    pattern_name: str
    description: str              # Problem + why now
    product_opportunity: str      # What to build
    solution: str                 # How solo builder + AI delivers it
    commercialisation: str        # Revenue path + effort estimate
    urgency: Literal["critical", "high", "medium", "low"]
    trend_direction: Literal["strengthening", "weakening", "stable"]
    solo_builder_score: int = Field(ge=1, le=10, description="1 = needs team/infra, 10 = weekend solo project")
    stack_suggestion: List[str] = Field(default_factory=list, description="Specific tools/frameworks")
    validation_path: str          # How to prove demand in 48h
    regions_affected: List[str]
    first_detected: str
    event_count: int

class MarketIntelligence(BaseModel):
    # Legacy fields — kept for backward compatibility with old signals
    consolidation_signals: List[ConsolidationSignal] = Field(default_factory=list)
    arbitrage_signals: List[ArbitrageSignal] = Field(default_factory=list)
    # New field — preferred for new signals
    build_signals: List[BuildSignal] = Field(default_factory=list)
    emerging_themes: List[dict] = Field(default_factory=list)

class AgentSignal(BaseModel):
    signal_id: str
    date: str
    swarm_id: str
    cohort: str
    region_focus: str
    creator_intelligence: List[CreatorIntelligence]
    market_intelligence: MarketIntelligence
    narrative: str
    submitted_at: Optional[str] = None

# --- API Response Models ---
class CreatorAlert(BaseModel):
    alert_id: str
    severity: Literal["critical", "high", "medium", "low", "observational"]
    region: str
    headline: str
    action: str
    deadline: Optional[str] = None
    content_formats: List[str]
    sources: List[str]

class DeadlineItem(BaseModel):
    deadline_id: str
    date: str
    region: str
    headline: str
    action_required: str
    days_remaining: int
    severity: Literal["critical", "high", "medium", "low"]

class MarketOpportunity(BaseModel):
    opportunity_id: str
    pattern_name: str
    regions_affected: List[str]
    description: str           # Problem
    product_opportunity: str   # Opportunity
    solution: Optional[str] = None           # NEW
    commercialisation: Optional[str] = None  # NEW
    urgency: Literal["critical", "high", "medium", "low"]
    data_gaps: List[str]
    first_detected: str
    trend_direction: Literal["strengthening", "weakening", "stable"]
    # New fields (optional for backward compat)
    solo_builder_score: Optional[int] = None
    stack_suggestion: Optional[List[str]] = None
    validation_path: Optional[str] = None

class PatternDetection(BaseModel):
    pattern_id: str
    pattern: str
    regions: List[str]
    event_count: int
    first_detected: str
    trend_direction: str
    signals: List[str]

class HealthResponse(BaseModel):
    status: str
    version: str
    database: str
    signal_count: int
    last_ingestion: Optional[str] = None
