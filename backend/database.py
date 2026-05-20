import json
import os
import sqlite3
from datetime import datetime
from typing import List, Optional, Dict, Any

TURSO_URL = os.getenv("TURSO_DATABASE_URL", "")
TURSO_TOKEN = os.getenv("TURSO_AUTH_TOKEN", "")
USE_LOCAL = not TURSO_URL or TURSO_URL.startswith("file:") or not TURSO_TOKEN

class Database:
    def __init__(self):
        self._local_conn = None
        self._initialized = False
    
    def _ensure_init(self):
        if self._initialized:
            return
        db_path = "/data/local.db" if os.path.exists("/data") else "local.db"
        self._local_conn = sqlite3.connect(db_path, check_same_thread=False)
        self._local_conn.row_factory = sqlite3.Row
        self._ensure_tables()
        print(f"[DB] Using local SQLite: {db_path}")
        self._initialized = True
    
    def _ensure_tables(self):
        c = self._local_conn.cursor()
        c.execute("CREATE TABLE IF NOT EXISTS signals (signal_id TEXT PRIMARY KEY, date TEXT, swarm_id TEXT, cohort TEXT, region_focus TEXT, payload TEXT, submitted_at TEXT)")
        c.execute("CREATE TABLE IF NOT EXISTS stats (key TEXT PRIMARY KEY, value TEXT)")
        self._local_conn.commit()
    
    def insert_signal(self, signal: Dict[str, Any]) -> bool:
        self._ensure_init()
        signal["submitted_at"] = datetime.utcnow().isoformat()
        try:
            c = self._local_conn.cursor()
            c.execute("INSERT OR REPLACE INTO signals VALUES (?,?,?,?,?,?,?)",
                [signal["signal_id"], signal.get("date",""), signal.get("swarm_id",""),
                 signal.get("cohort",""), signal.get("region_focus",""),
                 json.dumps(signal), signal["submitted_at"]])
            self._local_conn.commit()
            return True
        except Exception as e:
            print(f"[DB] Insert error: {e}")
            return False
    
    def get_signals(self, limit: int = 100) -> List[Dict[str, Any]]:
        self._ensure_init()
        c = self._local_conn.cursor()
        c.execute("SELECT payload FROM signals ORDER BY submitted_at DESC LIMIT ?", (limit,))
        return [json.loads(r[0]) for r in c.fetchall()]
    
    def get_signal_count(self) -> int:
        self._ensure_init()
        c = self._local_conn.cursor()
        c.execute("SELECT COUNT(*) FROM signals")
        return c.fetchone()[0]
    
    def get_last_ingestion(self) -> Optional[str]:
        self._ensure_init()
        c = self._local_conn.cursor()
        c.execute("SELECT submitted_at FROM signals ORDER BY submitted_at DESC LIMIT 1")
        r = c.fetchone()
        return r[0] if r else None

db = Database()
