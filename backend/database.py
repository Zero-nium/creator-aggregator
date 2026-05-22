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
        self._turso_url = None
        self._turso_token = None

    def _ensure_init(self):
        """Lazy init — safe to call from sync request handlers."""
        if self._initialized:
            return

        if not _should_use_local():
            # Try Turso first
            try:
                import libsql_experimental as libsql
                self._turso_url = os.getenv("TURSO_DATABASE_URL", "")
                self._turso_token = os.getenv("TURSO_AUTH_TOKEN", "")
                self._client = libsql.connect(self._turso_url, auth_token=self._turso_token)
                self._ensure_tables_turso()
                print(f"[DB] Connected to Turso: {self._turso_url}")
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

    def _reset_connection(self):
        """Reset and reinitialize Turso connection after Hrana stream error."""
        print("[DB] Resetting Turso connection...")
        self._initialized = False
        self._client = None
        self._ensure_init()

    def _is_hrana_error(self, e: Exception) -> bool:
        """Check if exception is a Hrana stream error."""
        err_str = str(e).lower()
        return any(x in err_str for x in ["stream not found", "hrana", "404"])

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
                if self._is_hrana_error(e):
                    try:
                        self._reset_connection()
                        if self._client:
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
                    except Exception as e2:
                        print(f"[DB] Turso insert retry failed: {e2}")
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
                rows = cursor.fetchall()
                return [json.loads(row[0]) for row in rows]
            except Exception as e:
                print(f"[DB] Turso query error: {e}")
                if self._is_hrana_error(e):
                    try:
                        self._reset_connection()
                        if self._client:
                            cursor = self._client.execute(
                                "SELECT payload FROM signals ORDER BY submitted_at DESC LIMIT ?",
                                (limit,)
                            )
                            rows = cursor.fetchall()
                            return [json.loads(row[0]) for row in rows]
                    except Exception as e2:
                        print(f"[DB] Turso query retry failed: {e2}")
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
                row = cursor.fetchone()
                return row[0] if row else 0
            except Exception as e:
                print(f"[DB] Turso count error: {e}")
                if self._is_hrana_error(e):
                    try:
                        self._reset_connection()
                        if self._client:
                            cursor = self._client.execute("SELECT COUNT(*) FROM signals")
                            row = cursor.fetchone()
                            return row[0] if row else 0
                    except Exception as e2:
                        print(f"[DB] Turso count retry failed: {e2}")
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
                row = cursor.fetchone()
                return row[0] if row else None
            except Exception as e:
                print(f"[DB] Turso last ingestion error: {e}")
                if self._is_hrana_error(e):
                    try:
                        self._reset_connection()
                        if self._client:
                            cursor = self._client.execute(
                                "SELECT submitted_at FROM signals ORDER BY submitted_at DESC LIMIT 1"
                            )
                            row = cursor.fetchone()
                            return row[0] if row else None
                    except Exception as e2:
                        print(f"[DB] Turso last ingestion retry failed: {e2}")
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
