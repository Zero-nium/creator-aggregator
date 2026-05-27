#!/usr/bin/env python3
"""Verify Beauty agent data push and validate format against backend expectations."""

import requests
import json
import sys
from datetime import datetime

API_BASE = "https://agent-dashboard-api-windblown-fog-6023.fly.dev"

# ─── Test 1: Health Check ───
print("=" * 60)
print("TEST 1: Health Check")
print("=" * 60)
try:
    resp = requests.get(f"{API_BASE}/api/v1/health", timeout=10)
    print(f"Status: {resp.status_code}")
    if resp.status_code == 200:
        data = resp.json()
        print(f"Database: {data.get('database')}")
        print(f"Signal count: {data.get('signal_count')}")
        print(f"Last ingestion: {data.get('last_ingestion')}")
        print(f"Version: {data.get('version')}")
    else:
        print(f"Response: {resp.text[:200]}")
except Exception as e:
    print(f"ERROR: {e}")

# ─── Test 2: Stats ───
print()
print("=" * 60)
print("TEST 2: Stats Endpoint")
print("=" * 60)
try:
    resp = requests.get(f"{API_BASE}/api/v1/stats", timeout=10)
    print(f"Status: {resp.status_code}")
    if resp.status_code == 200:
        data = resp.json()
        print(f"Total signals: {data.get('total_signals')}")
        print(f"Regions: {data.get('regions_covered')}")
        print(f"Cohorts: {data.get('cohorts')}")
        print(f"Severity distribution: {json.dumps(data.get('severity_distribution'), indent=2)}")
        print(f"Last ingestion: {data.get('last_ingestion')}")
    else:
        print(f"Response: {resp.text[:200]}")
except Exception as e:
    print(f"ERROR: {e}")

# ─── Test 3: Archive / Latest ───
print()
print("=" * 60)
print("TEST 3: Archive Latest (last 20)")
print("=" * 60)
try:
    resp = requests.get(f"{API_BASE}/api/v1/archive/latest?limit=20", timeout=10)
    print(f"Status: {resp.status_code}")
    if resp.status_code == 200:
        data = resp.json()
        signals = data.get("signals", [])
        print(f"Count: {data.get('count')}")
        print(f"Signals returned: {len(signals)}")

        for i, sig in enumerate(signals[:5]):  # Show first 5
            print(f"\n--- Signal {i+1} ---")
            print(f"  signal_id: {sig.get('signal_id')}")
            print(f"  date: {sig.get('date')}")
            print(f"  cohort: {sig.get('cohort')}")
            print(f"  swarm_id: {sig.get('swarm_id')}")
            print(f"  region_focus: {sig.get('region_focus')}")
            print(f"  creator_intelligence count: {len(sig.get('creator_intelligence', []))}")
            print(f"  market_intelligence consolidation: {len(sig.get('market_intelligence', {}).get('consolidation_signals', []))}")

            # Check for beauty cohort specifically
            if sig.get('cohort') == 'beauty':
                print(f"  >>> BEAUTY SIGNAL FOUND <<<")

            # Validate structure
            intels = sig.get('creator_intelligence', [])
            for j, intel in enumerate(intels[:2]):
                print(f"    Intel {j+1}: {intel.get('headline', 'N/A')[:60]}...")
                print(f"      region: {intel.get('region')}")
                print(f"      severity: {intel.get('severity')}")
                print(f"      signal_type: {intel.get('signal_type')}")
                print(f"      sources: {len(intel.get('sources', []))}")
    else:
        print(f"Response: {resp.text[:200]}")
except Exception as e:
    print(f"ERROR: {e}")

# ─── Test 4: Creator Alerts ───
print()
print("=" * 60)
print("TEST 4: Creator Alerts")
print("=" * 60)
try:
    resp = requests.get(f"{API_BASE}/api/v1/creator/alerts", timeout=10)
    print(f"Status: {resp.status_code}")
    if resp.status_code == 200:
        data = resp.json()
        print(f"Alerts count: {len(data)}")
        for alert in data[:3]:
            print(f"  - [{alert.get('severity')}] {alert.get('headline')[:50]}... ({alert.get('region')})")
    else:
        print(f"Response: {resp.text[:200]}")
except Exception as e:
    print(f"ERROR: {e}")

# ─── Test 5: Market Opportunities ───
print()
print("=" * 60)
print("TEST 5: Market Opportunities")
print("=" * 60)
try:
    resp = requests.get(f"{API_BASE}/api/v1/market/opportunities", timeout=10)
    print(f"Status: {resp.status_code}")
    if resp.status_code == 200:
        data = resp.json()
        print(f"Opportunities count: {len(data)}")
        for opp in data[:3]:
            print(f"  - [{opp.get('urgency')}] {opp.get('pattern_name')[:50]}... (trend: {opp.get('trend_direction')})")
    else:
        print(f"Response: {resp.text[:200]}")
except Exception as e:
    print(f"ERROR: {e}")

print()
print("=" * 60)
print("VERIFICATION COMPLETE")
print("=" * 60)
