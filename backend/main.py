"""
Agent Ingestion & Aggregation API
Lightweight PoC for content trend dashboard
Stack: FastAPI + Turso (libSQL) + Fly.io
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime, date
import uuid
import json
import libsql
import os

# Environment variables (set these in Fly.io secrets)
TURSO_URL = os.getenv("TURSO_DATABASE_URL", "file:local.db")
TURSO_AUTH_TOKEN = os.getenv("TURSO_AUTH_TOKEN", "")

# --- Pydantic Models ---

class Metric(BaseModel):
    label: str
    value: str

class Insight(BaseModel):
    title: str
    description: str
    metrics: List[Metric] = []
    tags: List[str] = []

class Citation(BaseModel):
    source: str
    context: Optional[str] = None
    url: Optional[str] = None

class ReportMetadata(BaseModel):
    platform: str
    region: str
    niche: str
    agentId: Optional[str] = None

class DailyReport(BaseModel):
    reportId: str = Field(default_factory=lambda: str(uuid.uuid4()))
    date: str = Field(default_factory=lambda: str(date.today()))
    metadata: ReportMetadata
    insights: List[Insight]
    citations: List[Citation]

class RawPayload(BaseModel):
    agent_id: str
    payload: Dict[str, Any]

class AggregationRequest(BaseModel):
    raw_ids: List[int]
    report: DailyReport

# --- FastAPI App ---

app = FastAPI(
    title="Agent Dashboard API",
    description="Ingestion and aggregation for content trend agents",
    version="0.1.0"
)

# --- Cors Middleware ---

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Database Client ---

def get_db():
    """Get libSQL database client (synchronous)"""
    if TURSO_AUTH_TOKEN and "libsql://" in TURSO_URL:
        return libsql.connect(TURSO_URL, auth_token=TURSO_AUTH_TOKEN)
    return libsql.connect(TURSO_URL)

def init_db():
    """Create tables if they don't exist"""
    db = get_db()
    db.execute("""
        CREATE TABLE IF NOT EXISTS raw_payloads (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            agent_id TEXT NOT NULL,
            received_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            payload TEXT NOT NULL,
            status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'processed', 'failed')),
            processed_at DATETIME,
            error_message TEXT
        )
    """)
    db.execute("""
        CREATE TABLE IF NOT EXISTS master_reports (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            report_id TEXT UNIQUE NOT NULL,
            date TEXT NOT NULL,
            metadata TEXT NOT NULL,
            insights TEXT NOT NULL,
            citations TEXT NOT NULL,
            aggregated_from TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    """)
    db.execute("CREATE INDEX IF NOT EXISTS idx_reports_date ON master_reports(date)")
    db.execute("CREATE INDEX IF NOT EXISTS idx_raw_agent ON raw_payloads(agent_id, received_at)")
    db.commit()
    db.close()
    print("Database initialized")

# --- Startup ---

@app.on_event("startup")
def startup():
    init_db()

# --- Endpoints ---

@app.post("/api/v1/raw")
def ingest_raw(data: RawPayload):
    """Collector agents push raw data here. Returns payload_id for verification."""
    db = get_db()
    cursor = db.execute(
        "INSERT INTO raw_payloads (agent_id, payload, status) VALUES (?, ?, 'pending')",
        (data.agent_id, json.dumps(data.payload))
    )
    payload_id = cursor.lastrowid
    db.commit()
    db.close()

    return {
        "received": True,
        "payload_id": payload_id,
        "status": "pending",
        "agent_id": data.agent_id,
        "timestamp": datetime.utcnow().isoformat()
    }

@app.get("/api/v1/raw/{payload_id}")
def get_raw_status(payload_id: int):
    """Agents verify their data was received and processed."""
    db = get_db()
    cursor = db.execute(
        "SELECT id, agent_id, status, processed_at, error_message FROM raw_payloads WHERE id = ?",
        (payload_id,)
    )
    row = cursor.fetchone()
    db.close()

    if not row:
        raise HTTPException(status_code=404, detail="Payload not found")

    return {
        "id": row[0],
        "agent_id": row[1],
        "status": row[2],
        "processed_at": row[3],
        "error_message": row[4]
    }

@app.post("/api/v1/aggregate")
def create_aggregate(request: AggregationRequest):
    """Master Aggregator pushes normalized report here. Marks raw payloads as processed."""
    db = get_db()
    report = request.report

    db.execute(
        """
        INSERT INTO master_reports (report_id, date, metadata, insights, citations, aggregated_from)
        VALUES (?, ?, ?, ?, ?, ?)
        ON CONFLICT(report_id) DO UPDATE SET
            metadata = excluded.metadata,
            insights = excluded.insights,
            citations = excluded.citations,
            aggregated_from = excluded.aggregated_from,
            updated_at = CURRENT_TIMESTAMP
        """,
        (
            report.reportId,
            report.date,
            json.dumps(report.metadata.model_dump()),
            json.dumps([i.model_dump() for i in report.insights]),
            json.dumps([c.model_dump() for c in report.citations]),
            json.dumps(request.raw_ids)
        )
    )

    for raw_id in request.raw_ids:
        db.execute(
            "UPDATE raw_payloads SET status = 'processed', processed_at = CURRENT_TIMESTAMP WHERE id = ?",
            (raw_id,)
        )

    db.commit()
    db.close()

    return {
        "aggregated": True,
        "report_id": report.reportId,
        "raw_ids_processed": len(request.raw_ids),
        "timestamp": datetime.utcnow().isoformat()
    }

@app.get("/api/v1/reports/latest")
def get_latest_report():
    """Dashboard polls this endpoint for the most recent aggregate report."""
    db = get_db()
    cursor = db.execute(
        """
        SELECT report_id, date, metadata, insights, citations, created_at
        FROM master_reports
        ORDER BY created_at DESC
        LIMIT 1
        """
    )
    row = cursor.fetchone()
    db.close()

    if not row:
        raise HTTPException(status_code=404, detail="No reports found")

    return {
        "reportId": row[0],
        "date": row[1],
        "metadata": json.loads(row[2]),
        "insights": json.loads(row[3]),
        "citations": json.loads(row[4]),
        "createdAt": row[5]
    }

@app.get("/api/v1/reports/{report_date}")
def get_report_by_date(report_date: str):
    """Get specific historical report by date."""
    db = get_db()
    cursor = db.execute(
        """
        SELECT report_id, date, metadata, insights, citations, created_at
        FROM master_reports
        WHERE date = ?
        ORDER BY created_at DESC
        LIMIT 1
        """,
        (report_date,)
    )
    row = cursor.fetchone()
    db.close()

    if not row:
        raise HTTPException(status_code=404, detail=f"No report found for {report_date}")

    return {
        "reportId": row[0],
        "date": row[1],
        "metadata": json.loads(row[2]),
        "insights": json.loads(row[3]),
        "citations": json.loads(row[4]),
        "createdAt": row[5]
    }

@app.get("/api/v1/health")
def health_check():
    """Simple health check for Fly.io / monitoring"""
    return {"status": "ok", "timestamp": datetime.utcnow().isoformat()}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8080)
