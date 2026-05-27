from pydantic import BaseModel, Field
from typing import List, Optional, Literal
from datetime import datetime

# --- Core Signal ---
class SignalSource(BaseModel):
    name: str
    url: Optional[str] = None
    date_accessed: str
    source_type: Literal["government", "news", "platform", "social", "industry"] = "government"

class CreatorIntelligence(BaseModel):
    region: str
    signal_type: Literal["regulatory_enforcement", "platform_policy", "compliance_deadline", 
                         "media_escalation", "creator_sentiment", "baseline"]
    severity: Literal["critical", "high", "medium", "low", "observational"]
    headline: str
    what_changed: str
    creator_risk: str
    creator_action: str
    content_format_at_risk: List[str] = Field(default_factory=list)
    deadline: Optional[str] = None
    sources: List[SignalSource]
    cross_references: List[str] = Field(default_factory=list)

class ConsolidationSignal(BaseModel):
    pattern: str
    regions_affected: List[str]
    description: str           # Problem: what regulatory/content gap exists
    product_opportunity: str   # Opportunity: what product category addresses this
    solution: Optional[str] = None           # NEW: How the product works
    commercialisation: Optional[str] = None  # NEW: Revenue model, adoption path
    urgency: Literal["critical", "high", "medium", "low"]
    first_detected: str
    event_count: int
    trend_direction: Literal["strengthening", "weakening", "stable"]

class ArbitrageSignal(BaseModel):
    description: str
    opportunity: str
    data_gap: Optional[str] = None
    regions_affected: List[str] = Field(default_factory=list)

class MarketIntelligence(BaseModel):
    consolidation_signals: List[ConsolidationSignal] = Field(default_factory=list)
    arbitrage_signals: List[ArbitrageSignal] = Field(default_factory=list)
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
