#!/usr/bin/env python3
"""Seed the database with example signals using the new expanded taxonomy."""
import requests
import json
import sys
import argparse

# Example: Gaming cohort — monetization_change signal
GAMING_MONETIZATION_SIGNAL = {
    "signal_id": "sig_2026_05_29_gaming_apac_001",
    "date": "2026-05-29",
    "swarm_id": "gaming-swarm-01",
    "cohort": "gaming",
    "region_focus": "APAC",
    "creator_intelligence": [
        {
            "region": "Japan",
            "signal_type": "monetization_change",
            "severity": "high",
            "headline": "Twitch Japan introduces micro-tipping (100¥ floor) with 85/15 split",
            "what_changed": "Twitch Japan rolled out micro-tipping with a 100¥ minimum and an 85% creator / 15% platform revenue split, bypassing the standard 50/50 sub split for small streamers.",
            "creator_risk": "Streamers not opted into the new monetization tier will see sub revenue halved compared to peers who switch.",
            "creator_action": "Opt into micro-tipping tier immediately. Promote 100¥ tips during streams. Track conversion vs traditional subs.",
            "content_format_at_risk": ["live_streaming", "just_chatting", "speedrun_attempts"],
            "sources": [
                {"name": "Twitch Japan Blog", "date_accessed": "2026-05-28", "source_type": "platform"},
                {"name": "StreamElements Report", "date_accessed": "2026-05-28", "source_type": "analytics"}
            ],
            "cross_references": []
        },
        {
            "region": "South Korea",
            "signal_type": "engagement_pattern",
            "severity": "medium",
            "headline": "AfreecaTV 'relay challenge' format driving 3x comment rates",
            "what_changed": "AfreecaTV creators running 24-hour relay streams (handing off to the next creator every 4 hours) are seeing 3x comment engagement and 40% follower growth week-over-week.",
            "creator_risk": "Solo streamers not participating in relay networks are losing discoverability to collaborative channels.",
            "creator_action": "Join or form a 4-6 creator relay network. Schedule consistent handoff times. Cross-promote each participant's channel.",
            "content_format_at_risk": ["solo_live_streaming", "variety_gaming"],
            "sources": [
                {"name": "AfreecaTV Creator Dashboard", "date_accessed": "2026-05-27", "source_type": "analytics"},
                {"name": "Korean Creator Discord", "date_accessed": "2026-05-28", "source_type": "social"}
            ],
            "cross_references": []
        }
    ],
    "market_intelligence": {
        "build_signals": [
            {
                "pattern_name": "Relay Stream Coordination Bot",
                "description": "AfreecaTV relay challenges require manual coordination (scheduling, handoff alerts, viewer carryover). No tool automates this across platforms.",
                "product_opportunity": "Cross-platform relay stream scheduler + handoff bot that manages creator queues, sends alerts, and carries viewer counts across Twitch/YouTube/AfreecaTV.",
                "solution": "Next.js dashboard for relay network creation. Discord bot for handoff alerts. OAuth to Twitch/YouTube APIs for viewer count carryover. Supabase for real-time queue state.",
                "commercialisation": "Freemium: free for 3-creator networks, $15/mo for unlimited. Affiliate cut from StreamElements integration. Solo builder + Cursor + Claude, 6-8 week build.",
                "urgency": "high",
                "trend_direction": "strengthening",
                "solo_builder_score": 7,
                "stack_suggestion": ["Next.js 14", "Vercel", "Supabase", "Discord.js", "Twitch API", "YouTube Data API"],
                "validation_path": "Post in 5 creator Discords offering manual relay coordination. Measure signups. Build MVP for first network.",
                "regions_affected": ["South Korea", "Japan", "Indonesia"],
                "first_detected": "2026-05-27",
                "event_count": 3
            },
            {
                "pattern_name": "Micro-Tip Alert Overlay",
                "description": "Twitch Japan's 100¥ micro-tips need custom alert overlays (default alerts look cheap). Creators want branded, animated alerts that feel premium at low price points.",
                "product_opportunity": "Template-based micro-tip alert generator — creators upload branding, pick animation style, get OBS-ready overlay in 30 seconds.",
                "solution": "Web app with Canvas/SVG animation engine. Export to OBS Browser Source. Pre-built templates for gaming, IRL, art niches. Stripe for one-time template purchases.",
                "commercialisation": "Template marketplace: $5-15 per template. Custom design tier at $50. No subscription — creators hate recurring fees for overlays. Weekend project with n8n + Figma API.",
                "urgency": "medium",
                "trend_direction": "strengthening",
                "solo_builder_score": 9,
                "stack_suggestion": ["Next.js", "Vercel", "Figma API", "Canvas API", "Stripe"],
                "validation_path": "Post 3 free templates on r/Twitch and X. Track downloads. Gauge demand for custom tier.",
                "regions_affected": ["Japan"],
                "first_detected": "2026-05-28",
                "event_count": 1
            }
        ],
        "consolidation_signals": [],
        "arbitrage_signals": [],
        "emerging_themes": [
            {
                "theme": "Micro-Monetization Wave",
                "momentum": "building",
                "affected_markets": ["Japan", "South Korea"],
                "first_detected": "2026-05-27"
            }
        ]
    },
    "narrative": "Gaming APAC Signal (May 29, 2026). Twitch Japan micro-tipping reshapes small-streamer revenue. AfreecaTV relay challenges prove collaborative formats beat solo discoverability. Two solo-buildable tools identified: relay coordination bot (7/10 feasibility) and micro-tip alert overlay generator (9/10 feasibility)."
}

# Example: Beauty cohort — content_zeitgeist signal
BEAUTY_ZEITGEIST_SIGNAL = {
    "signal_id": "sig_2026_05_29_beauty_apac_001",
    "date": "2026-05-29",
    "swarm_id": "beauty-swarm-01",
    "cohort": "beauty",
    "region_focus": "APAC",
    "creator_intelligence": [
        {
            "region": "Indonesia",
            "signal_type": "content_zeitgeist",
            "severity": "high",
            "headline": "'Skin cycling' format pivoting from educational to ASMR-driven routines",
            "what_changed": "Indonesian beauty creators pivoting from talking-head 'skin cycling' tutorials to ASMR-style routine videos (no voiceover, product sounds only) are seeing 2.5x average view duration and 40% more saves.",
            "creator_risk": "Talking-head educational beauty content is losing share of voice to immersive/ASMR formats. Creators not adapting face 20-30% view decline.",
            "creator_action": "Film one ASMR skin cycling video this week. Use lavalier mic for product sounds. Test against existing talking-head format. Track saves + AVD.",
            "content_format_at_risk": ["talking_head_tutorial", "educational_skincare", "voiceover_routine"],
            "sources": [
                {"name": "TikTok Creator Portal Indonesia", "date_accessed": "2026-05-28", "source_type": "platform"},
                {"name": "Beauty Creator WhatsApp Group", "date_accessed": "2026-05-28", "source_type": "social"}
            ],
            "cross_references": []
        },
        {
            "region": "Thailand",
            "signal_type": "commercial_opportunity",
            "severity": "medium",
            "headline": "Shopee Thailand opens 'nano-influencer' tier (<5k followers) with guaranteed $30/post",
            "what_changed": "Shopee Thailand launched a guaranteed payout program for nano-influencers in beauty/skincare: $30 per approved post, no minimum sales requirement, targeting emerging creators in tier-2 cities.",
            "creator_risk": "Creators in Bangkok/Singapore may see rate compression as brands shift budget to nano-tier in tier-2 markets.",
            "creator_action": "If under 5k followers in Thailand: apply to Shopee nano program immediately. If over 5k: diversify into affiliate + own-product revenue to offset rate pressure.",
            "content_format_at_risk": ["sponsored_reviews", "product_showcases"],
            "sources": [
                {"name": "Shopee Seller Centre", "date_accessed": "2026-05-27", "source_type": "platform"},
                {"name": "Bangkok Post Business", "date_accessed": "2026-05-27", "source_type": "news"}
            ],
            "cross_references": []
        }
    ],
    "market_intelligence": {
        "build_signals": [
            {
                "pattern_name": "ASMR Beauty Sound Library",
                "description": "ASMR beauty videos need high-quality product sounds (serum drops, cream scoops, brush strokes). Creators currently record their own or use generic stock audio that breaks immersion.",
                "product_opportunity": "Curated sound library of 200+ beauty-specific ASMR clips, tagged by product type and action, with one-click import to CapCut/Premiere.",
                "solution": "Record sounds in a treated room with stereo mic. Tag with AI (Whisper for product name detection). Web app for browsing/preview. Export plugins for CapCut + Premiere.",
                "commercialisation": "Subscription: $8/mo for 50 downloads, $20/mo unlimited. One-time packs for specific niches (skincare, makeup, hair). Solo builder + AI, 4-6 weeks.",
                "urgency": "high",
                "trend_direction": "strengthening",
                "solo_builder_score": 8,
                "stack_suggestion": ["Next.js", "Vercel", "Supabase", "Whisper API", "Stripe"],
                "validation_path": "Post 10 free ASMR clips on TikTok/Instagram. Track saves and comments asking for more. Build waitlist.",
                "regions_affected": ["Indonesia", "Thailand", "Philippines"],
                "first_detected": "2026-05-28",
                "event_count": 2
            }
        ],
        "consolidation_signals": [],
        "arbitrage_signals": [],
        "emerging_themes": [
            {
                "theme": "ASMR Beauty Pivot",
                "momentum": "accelerating",
                "affected_markets": ["Indonesia", "Thailand", "Vietnam"],
                "first_detected": "2026-05-25"
            }
        ]
    },
    "narrative": "Beauty APAC Signal (May 29, 2026). ASMR-driven beauty content is displacing talking-head tutorials in Indonesia. Shopee Thailand's nano-influencer program opens guaranteed revenue for sub-5k creators. Solo-buildable tool: ASMR beauty sound library (8/10 feasibility, 4-6 week build)."
}

# Legacy seed signals (kept for backward compatibility testing)
LEGACY_HEALTH_SIGNAL = {
    "signal_id": "sig_2026_05_20_health_apac_001",
    "date": "2026-05-20",
    "swarm_id": "73694b3e",
    "cohort": "health",
    "region_focus": "APAC",
    "creator_intelligence": [
        {
            "region": "Australia",
            "signal_type": "regulatory_enforcement",
            "severity": "high",
            "headline": "TGA joins INTERPOL Operation Pangea XVIII targeting peptide promotion",
            "what_changed": "Social media accounts promoting illicit therapeutic goods (peptides) now under international enforcement.",
            "creator_risk": "Channels promoting peptides face account suspension, legal liability, SIRS misinformation exposure.",
            "creator_action": "Immediately audit content for peptide claims. Remove or add medical disclaimers. Verify TGA registration of any mentioned products.",
            "content_format_at_risk": ["supplement_reviews", "fitness_protocols", "biohacking"],
            "sources": [
                {"name": "TGA.gov.au", "date_accessed": "2026-05-19", "source_type": "government"}
            ],
            "cross_references": ["sig_2026_05_19_health_apac_001"]
        }
    ],
    "market_intelligence": {
        "consolidation_signals": [
            {
                "pattern": "ai_voice_disclosure_gap",
                "regions_affected": ["Japan", "Australia", "South Korea"],
                "description": "Multiple APAC markets enforcing AI-content disclosure simultaneously",
                "product_opportunity": "Cross-market AI-voice disclosure SaaS for creators",
                "urgency": "high",
                "first_detected": "2026-05-19",
                "event_count": 3,
                "trend_direction": "strengthening"
            }
        ],
        "arbitrage_signals": [],
        "emerging_themes": []
    },
    "narrative": "Legacy health signal for backward compatibility testing."
}

def seed_local():
    """Seed using direct database import (for local testing)."""
    import sys
    sys.path.insert(0, ".")
    from database import db

    for signal in [GAMING_MONETIZATION_SIGNAL, BEAUTY_ZEITGEIST_SIGNAL, LEGACY_HEALTH_SIGNAL]:
        db.insert_signal(signal)
        print(f"Seeded: {signal['signal_id']}")

    print(f"Total signals: {db.get_signal_count()}")

def seed_remote(base_url: str, api_key: str):
    """Seed via API endpoint."""
    headers = {"x-api-key": api_key, "Content-Type": "application/json"}

    for signal in [GAMING_MONETIZATION_SIGNAL, BEAUTY_ZEITGEIST_SIGNAL, LEGACY_HEALTH_SIGNAL]:
        resp = requests.post(
            f"{base_url}/api/v1/signals/ingest",
            headers=headers,
            json=signal,
            timeout=30
        )
        if resp.status_code == 200:
            print(f"✅ Ingested: {signal['signal_id']}")
        else:
            print(f"❌ Failed: {signal['signal_id']} — {resp.status_code}: {resp.text}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Seed Creator Aggregator database")
    parser.add_argument("--prod", help="Production base URL (e.g., https://api.fly.dev)")
    parser.add_argument("--api-key", default="dev-key-change-me", help="API key for ingest")
    args = parser.parse_args()

    if args.prod:
        seed_remote(args.prod.rstrip("/"), args.api_key)
    else:
        seed_local()
