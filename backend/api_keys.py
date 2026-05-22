#!/usr/bin/env python3
"""
API Key Manager — uses existing database.py connection (Turso/SQLite)
Run: python3 api_keys.py generate --cohort health --label "animoca-minds-health"
"""
import argparse
import hashlib
import secrets
import sys
from datetime import datetime, timezone

# Import your existing DB
from database import db

def _hash_key(key: str) -> str:
    return hashlib.sha256(key.encode()).hexdigest()

def _ensure_table():
    """Create api_keys table in the same DB as signals."""
    db._ensure_init()
    if db._client:
        db._client.execute("""
            CREATE TABLE IF NOT EXISTS api_keys (
                key_id TEXT PRIMARY KEY,
                key_hash TEXT NOT NULL UNIQUE,
                cohort TEXT NOT NULL,
                label TEXT,
                created_at TEXT NOT NULL,
                last_used_at TEXT,
                is_active INTEGER DEFAULT 1,
                rate_limit INTEGER DEFAULT 10
            )
        """)
        db._client.commit()
    else:
        c = db._local_conn.cursor()
        c.execute("""
            CREATE TABLE IF NOT EXISTS api_keys (
                key_id TEXT PRIMARY KEY,
                key_hash TEXT NOT NULL UNIQUE,
                cohort TEXT NOT NULL,
                label TEXT,
                created_at TEXT NOT NULL,
                last_used_at TEXT,
                is_active INTEGER DEFAULT 1,
                rate_limit INTEGER DEFAULT 10
            )
        """)
        db._local_conn.commit()

def generate_key(cohort: str, label: str = "", rate_limit: int = 10) -> dict:
    _ensure_table()
    
    raw_key = f"ca_{cohort}_{secrets.token_urlsafe(32)}"
    key_hash = _hash_key(raw_key)
    key_id = secrets.token_hex(8)
    now = datetime.now(timezone.utc).isoformat()
    
    if db._client:
        db._client.execute(
            "INSERT INTO api_keys (key_id, key_hash, cohort, label, created_at, rate_limit) VALUES (?, ?, ?, ?, ?, ?)",
            (key_id, key_hash, cohort, label, now, rate_limit)
        )
        db._client.commit()
    else:
        c = db._local_conn.cursor()
        c.execute(
            "INSERT INTO api_keys (key_id, key_hash, cohort, label, created_at, rate_limit) VALUES (?, ?, ?, ?, ?, ?)",
            (key_id, key_hash, cohort, label, now, rate_limit)
        )
        db._local_conn.commit()
    
    return {
        "key_id": key_id,
        "api_key": raw_key,  # ONLY shown once
        "cohort": cohort,
        "label": label,
        "rate_limit": rate_limit,
        "created_at": now
    }

def list_keys():
    _ensure_table()
    if db._client:
        cursor = db._client.execute(
            "SELECT key_id, cohort, label, created_at, last_used_at, is_active, rate_limit FROM api_keys ORDER BY created_at DESC"
        )
        rows = cursor.fetchall()
    else:
        c = db._local_conn.cursor()
        c.execute("SELECT key_id, cohort, label, created_at, last_used_at, is_active, rate_limit FROM api_keys ORDER BY created_at DESC")
        rows = c.fetchall()
    
    return [
        {
            "key_id": row[0],
            "cohort": row[1],
            "label": row[2],
            "created_at": row[3],
            "last_used_at": row[4],
            "is_active": bool(row[5]),
            "rate_limit": row[6]
        }
        for row in rows
    ]

def revoke_key(key_id: str):
    _ensure_table()
    if db._client:
        db._client.execute("UPDATE api_keys SET is_active = 0 WHERE key_id = ?", (key_id,))
        db._client.commit()
    else:
        c = db._local_conn.cursor()
        c.execute("UPDATE api_keys SET is_active = 0 WHERE key_id = ?", (key_id,))
        db._local_conn.commit()
    return True

def verify_key(api_key: str):
    """Returns cohort info if valid, None otherwise. Called by main.py"""
    _ensure_table()
    key_hash = _hash_key(api_key)
    
    if db._client:
        cursor = db._client.execute(
            "SELECT key_id, cohort, rate_limit, is_active FROM api_keys WHERE key_hash = ?",
            (key_hash,)
        )
        row = cursor.fetchone()
    else:
        c = db._local_conn.cursor()
        c.execute("SELECT key_id, cohort, rate_limit, is_active FROM api_keys WHERE key_hash = ?", (key_hash,))
        row = c.fetchone()
    
    if not row or not row[3]:  # is_active check
        return None
    
    key_id, cohort, rate_limit, _ = row
    
    # Update last_used_at
    now = datetime.now(timezone.utc).isoformat()
    if db._client:
        db._client.execute("UPDATE api_keys SET last_used_at = ? WHERE key_id = ?", (now, key_id))
        db._client.commit()
    else:
        c = db._local_conn.cursor()
        c.execute("UPDATE api_keys SET last_used_at = ? WHERE key_id = ?", (now, key_id))
        db._local_conn.commit()
    
    return {"key_id": key_id, "cohort": cohort, "rate_limit": rate_limit}

def main():
    parser = argparse.ArgumentParser(description="API Key Manager")
    sub = parser.add_subparsers(dest="cmd")
    
    gen = sub.add_parser("generate")
    gen.add_argument("--cohort", required=True)
    gen.add_argument("--label", default="")
    gen.add_argument("--rate-limit", type=int, default=10)
    
    sub.add_parser("list")
    
    rev = sub.add_parser("revoke")
    rev.add_argument("key_id")
    
    ver = sub.add_parser("verify")
    ver.add_argument("api_key")
    
    args = parser.parse_args()
    
    if args.cmd == "generate":
        result = generate_key(args.cohort, args.label, args.rate_limit)
        print("\n" + "="*60)
        print("API KEY GENERATED — COPY NOW, WON'T BE SHOWN AGAIN")
        print("="*60)
        print(f"Key ID:     {result['key_id']}")
        print(f"API Key:    {result['api_key']}")
        print(f"Cohort:     {result['cohort']}")
        print(f"Label:      {result['label'] or 'N/A'}")
        print(f"Rate Limit: {result['rate_limit']}/hour")
        print(f"Created:    {result['created_at']}")
        print("="*60 + "\n")
    
    elif args.cmd == "list":
        keys = list_keys()
        if not keys:
            print("No keys found.")
            return
        print(f"\n{'Key ID':<12} {'Cohort':<10} {'Label':<20} {'Active':<8} {'Rate':<8}")
        print("-" * 70)
        for k in keys:
            label = (k['label'][:18] + "..") if k['label'] and len(k['label']) > 20 else (k['label'] or "-")
            print(f"{k['key_id']:<12} {k['cohort']:<10} {label:<20} {'Yes' if k['is_active'] else 'No':<8} {k['rate_limit']:<8}")
    
    elif args.cmd == "revoke":
        revoke_key(args.key_id)
        print(f"Key {args.key_id} revoked.")
    
    elif args.cmd == "verify":
        result = verify_key(args.api_key)
        if result:
            print(f"Valid — cohort: {result['cohort']}, rate: {result['rate_limit']}/hour")
        else:
            print("Invalid or revoked key.")
    
    else:
        parser.print_help()

if __name__ == "__main__":
    main()