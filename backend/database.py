import json
import os
import sqlite3
from datetime import datetime
from typing import List, Optional, Dict, Any

def _should_use_local() -> bool:
    """Runtime check for whether to use local SQLite instead of Turso."""
    url = os.getenv("TURSO_DATABASE_URL", "")
    token = os.getenv("TURSO_AUTH_TOKEN", "")
    return not url or url.startswith("file:") or not token

class Database:
    def __init__(self):
        self._client = None
        self._local_conn = None
        self._initialized = False
    
    def _ensure_init(self):
        """Lazy init — safe to call from sync request handlers."""
        if self._initialized:
            return
        
        if not _should_use_local():
            # Try Turso first
            try:
                import libsql_experimental as libsql
                url = os.getenv("TURSO_DATABASE_URL", "")
                token = os.getenv("TURSO_AUTH_TOKEN", "")
                self._client = libsql.connect(url, auth_token=token)
                self._ensure_tables_turso()
                print(f"[DB] Connected to Turso: {url}")
                self._initialized = True
                return
            except Exception as e:
                print(f"[DB] Turso connection failed: {e}. Falling back to local SQLite.")
        
        # Fallback to local SQLite
        db_path = "/data/local.db" if os.path.exists("/data") else "local.db"
        self._local_conn = sqlite3.connect(db_path, check_same_thread=False)
        self._local_conn.row_factory = sqlite3.Row
        self._ensure_tables_sqlite()
        print(f"[DB] Using local SQLite: {db_path}")
        self._initialized = True
    
    def _ensure_tables_turso(self):
        self._client.execute("""
            CREATE TABLE IF NOT EXISTS signals (
                signal_id TEXT PRIMARY KEY,
                date TEXT,
                swarm_id TEXT,
                cohort TEXT,
                region_focus TEXT,
                payload TEXT,
                submitted_at TEXT
            )
        """)
        self._client.execute("""
            CREATE TABLE IF NOT EXISTS stats (
                key TEXT PRIMARY KEY,
                value TEXT
            )
        """)
        self._client.commit()
    
    def _ensure_tables_sqlite(self):
        c = self._local_conn.cursor()
        c.execute("""
            CREATE TABLE IF NOT EXISTS signals (
                signal_id TEXT PRIMARY KEY,
                date TEXT,
                swarm_id TEXT,
                cohort TEXT,
                region_focus TEXT,
                payload TEXT,
                submitted_at TEXT
            )
        """)
        c.execute("""
            CREATE TABLE IF NOT EXISTS stats (
                key TEXT PRIMARY KEY,
                value TEXT
            )
        """)
        self._local_conn.commit()
    
    def insert_signal(self, signal: Dict[str, Any]) -> bool:
        self._ensure_init()
        signal["submitted_at"] = datetime.utcnow().isoformat()
        
        if self._client:
            try:
                self._client.execute(
                    "INSERT OR REPLACE INTO signals (signal_id, date, swarm_id, cohort, region_focus, payload, submitted_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
                    (
                        signal["signal_id"],
                        signal.get("date", ""),
                        signal.get("swarm_id", ""),
                        signal.get("cohort", ""),
                        signal.get("region_focus", ""),
                        json.dumps(signal),
                        signal["submitted_at"]
                    )
                )
                self._client.commit()
                self._update_stats_turso()
                return True
            except Exception as e:
                print(f"[DB] Turso insert error: {e}")
                return False
        else:
            try:
                c = self._local_conn.cursor()
                c.execute(
                    "INSERT OR REPLACE INTO signals VALUES (?, ?, ?, ?, ?, ?, ?)",
                    [signal["signal_id"], signal.get("date", ""), signal.get("swarm_id", ""),
                     signal.get("cohort", ""), signal.get("region_focus", ""),
                     json.dumps(signal), signal["submitted_at"]]
                )
                self._local_conn.commit()
                return True
            except Exception as e:
                print(f"[DB] SQLite insert error: {e}")
                return False
    
    def get_signals(self, limit: int = 100) -> List[Dict[str, Any]]:
        self._ensure_init()
        if self._client:
            try:
                cursor = self._client.execute(
                    "SELECT payload FROM signals ORDER BY submitted_at DESC LIMIT ?",
                    (limit,)
                )
                rows = list(cursor)
                return [json.loads(row[0]) for row in rows]
            except Exception as e:
                print(f"[DB] Turso query error: {e}")
                return []
        else:
            c = self._local_conn.cursor()
            c.execute("SELECT payload FROM signals ORDER BY submitted_at DESC LIMIT ?", (limit,))
            return [json.loads(r[0]) for r in c.fetchall()]
    
    def get_signal_count(self) -> int:
        self._ensure_init()
        if self._client:
            try:
                cursor = self._client.execute("SELECT COUNT(*) FROM signals")
                rows = list(cursor)
                return rows[0][0] if rows else 0
            except:
                return 0
        else:
            c = self._local_conn.cursor()
            c.execute("SELECT COUNT(*) FROM signals")
            return c.fetchone()[0]
    
    def get_last_ingestion(self) -> Optional[str]:
        self._ensure_init()
        if self._client:
            try:
                cursor = self._client.execute(
                    "SELECT submitted_at FROM signals ORDER BY submitted_at DESC LIMIT 1"
                )
                rows = list(cursor)
                return rows[0][0] if rows else None
            except:
                return None
        else:
            c = self._local_conn.cursor()
            c.execute("SELECT submitted_at FROM signals ORDER BY submitted_at DESC LIMIT 1")
            r = c.fetchone()
            return r[0] if r else None
    
    def _update_stats_turso(self):
        try:
            count = self.get_signal_count()
            self._client.execute(
                "INSERT OR REPLACE INTO stats (key, value) VALUES (?, ?)",
                ("signal_count", str(count))
            )
            self._client.execute(
                "INSERT OR REPLACE INTO stats (key, value) VALUES (?, ?)",
                ("last_ingestion", datetime.utcnow().isoformat())
            )
            self._client.commit()
        except Exception as e:
            print(f"[DB] Stats update error: {e}")

db = Database()