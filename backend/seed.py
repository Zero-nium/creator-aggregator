#!/usr/bin/env python3
"""Seed the database with May 2026 APAC Health signals."""
import requests
import json
import sys
import argparse

# May 20, 2026 APAC Health signal (structured)
MAY_20_SIGNAL = {
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
        },
        {
            "region": "Japan",
            "signal_type": "platform_policy",
            "severity": "critical",
            "headline": "AI-voice + templated workflow demonetization wave peaks",
            "what_changed": "YouTube demonetizing fitness channels using high-fidelity TTS (ElevenLabs) without on-camera presence.",
            "creator_risk": "Revenue loss for channels relying on AI-narrated content without human visual anchor.",
            "creator_action": "Add on-camera segments. Disclose AI voice use. Transform visual content (before/after, technique demos).",
            "content_format_at_risk": ["ai_voice_narration", "templated_workouts", "text_to_speech_reviews"],
            "sources": [
                {"name": "Moshion", "date_accessed": "2026-05-20", "source_type": "industry"},
                {"name": "Yutura", "date_accessed": "2026-05-20", "source_type": "industry"}
            ],
            "cross_references": ["sig_2026_05_19_health_apac_001"]
        },
        {
            "region": "Indonesia",
            "signal_type": "compliance_deadline",
            "severity": "medium",
            "headline": "June 6 final deadline for child-safety self-assessment (PP TUNAS)",
            "what_changed": "YouTube collecting self-assessment data. Deactivation counts non-public vs TikTok's 1.7M transparency.",
            "creator_risk": "Channels with youth-facing health content may face unannounced deactivation.",
            "creator_action": "Complete self-assessment early. Document child-safety measures. Consider migrating youth content to compliant formats.",
            "content_format_at_risk": ["youth_fitness", "teen_nutrition", "family_wellness"],
            "deadline": "2026-06-06",
            "sources": [
                {"name": "Komdigi", "date_accessed": "2026-05-20", "source_type": "government"}
            ],
            "cross_references": []
        },
        {
            "region": "South Korea",
            "signal_type": "baseline",
            "severity": "observational",
            "headline": "AI-persona disclosure monitoring continues (KFTC roadmap)",
            "what_changed": "MFDS AI-cops continue monitoring virtual endorsers. No new enforcement actions this cycle.",
            "creator_risk": "Virtual endorsers in health/fitness must maintain disclosure standards.",
            "creator_action": "Maintain AI disclosure labels. Monitor KFTC guidance updates.",
            "content_format_at_risk": ["virtual_endorser", "ai_persona"],
            "sources": [
                {"name": "MFDS", "date_accessed": "2026-05-20", "source_type": "government"}
            ],
            "cross_references": []
        },
        {
            "region": "India",
            "signal_type": "baseline",
            "severity": "observational",
            "headline": "SGI labeling notification watch continues",
            "what_changed": "No new Gazette notifications. Continuous monitoring for SGI labeling requirements.",
            "creator_risk": "Health creators must stay ready for SGI disclosure mandates.",
            "creator_action": "Monitor MeitY notifications. Prepare content labeling workflows.",
            "content_format_at_risk": ["health_advice", "wellness_content"],
            "sources": [
                {"name": "MeitY", "date_accessed": "2026-05-20", "source_type": "government"}
            ],
            "cross_references": []
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
            },
            {
                "pattern": "regulatory_transparency_gap",
                "regions_affected": ["Indonesia"],
                "description": "YouTube opacity on deactivation counts vs TikTok transparency",
                "product_opportunity": "Creator audit/appeal tooling for opaque platform enforcement",
                "urgency": "medium",
                "first_detected": "2026-05-19",
                "event_count": 2,
                "trend_direction": "stable"
            }
        ],
        "arbitrage_signals": [
            {
                "description": "Indonesia lagging TikTok in transparency = trust gap",
                "opportunity": "Third-party creator protection/insurance product for Indonesian market",
                "data_gap": "YouTube deactivation counts not public",
                "regions_affected": ["Indonesia"]
            }
        ],
        "emerging_themes": [
            {
                "theme": "Inauthentic Content Wave",
                "momentum": "peaking",
                "affected_markets": ["Japan"],
                "first_detected": "2026-05-19"
            }
        ]
    },
    "narrative": "Daily Signal Update: YouTube Health APAC (May 20, 2026). Source-first.\n\n1. Australia (Global Enforcement): TGA confirmed participation in INTERPOL's Operation Pangea XVIII, targeting social media accounts promoting illicit therapeutic goods (peptides). Alerts warn of Systemic Inflammatory Response Syndrome (SIRS) risks. (Source: TGA.gov.au; 2026-05-19).\n\n2. Japan (Monetization Peak): The 'Inauthentic Content' wave peaked May 19-20 with widespread demonetization of fitness channels using AI-voice and templated workflows. (Source: Moshion / Yutura; 2026-05-20).\n\n3. Indonesia (Audit Lock): June 6 remains the final deadline for child-safety self-assessment (PP TUNAS). YouTube's specific deactivation counts remain non-public. (Source: Komdigi; 2026-05-20).\n\n4. South Korea & India: Baselines steady. South Korea focuses on AI-persona disclosure (KFTC roadmap); India remains in notification-watch for continuous SGI labeling. (Source: MeitY / MFDS; 2026-05-20)."
}

# May 19, 2026 APAC Health signal
MAY_19_SIGNAL = {
    "signal_id": "sig_2026_05_19_health_apac_001",
    "date": "2026-05-19",
    "swarm_id": "73694b3e",
    "cohort": "health",
    "region_focus": "APAC",
    "creator_intelligence": [
        {
            "region": "Australia",
            "signal_type": "media_escalation",
            "severity": "high",
            "headline": "Mainstream media linking influencers to peptide injuries",
            "what_changed": "High-visibility reports (Adelaide Now, Courier Mail) linking social media influencers to injuries from unregulated peptide websites.",
            "creator_risk": "Mainstreaming of 'peptide harm' narrative signals potential ACCC/eSafety escalations beyond TGA medical enforcement.",
            "creator_action": "Audit all supplement mentions. Prepare legal disclaimers. Monitor ACCC and eSafety Commissioner statements.",
            "content_format_at_risk": ["supplement_reviews", "fitness_protocols", "biohacking"],
            "sources": [
                {"name": "The Advertiser", "date_accessed": "2026-05-18", "source_type": "news"},
                {"name": "Courier Mail", "date_accessed": "2026-05-18", "source_type": "news"}
            ],
            "cross_references": []
        },
        {
            "region": "Japan",
            "signal_type": "creator_sentiment",
            "severity": "high",
            "headline": "Fitness creator sentiment confirms AI-voice demonetization risk",
            "what_changed": "Social sentiment among fitness creators confirms 'Inauthentic Content' wave remains primary monetization risk.",
            "creator_risk": "Channels using high-fidelity TTS without significant on-camera presence remain under active demonetization pressure.",
            "creator_action": "Add on-camera presence. Disclose AI voice. Diversify content formats.",
            "content_format_at_risk": ["ai_voice_narration", "templated_workouts"],
            "sources": [
                {"name": "X", "date_accessed": "2026-05-18", "source_type": "social"},
                {"name": "Yutura", "date_accessed": "2026-05-18", "source_type": "industry"}
            ],
            "cross_references": []
        },
        {
            "region": "Indonesia",
            "signal_type": "compliance_deadline",
            "severity": "medium",
            "headline": "YouTube collecting self-assessment data for June 6 audit",
            "what_changed": "No change in regulatory status. YouTube remains in collection window. Public transparency on deactivation counts still lagging behind TikTok (1.7M).",
            "creator_risk": "Channels with youth-facing content may face unannounced deactivation if assessment incomplete.",
            "creator_action": "Complete self-assessment early. Document child-safety measures.",
            "content_format_at_risk": ["youth_fitness", "teen_nutrition"],
            "deadline": "2026-06-06",
            "sources": [
                {"name": "Komdigi", "date_accessed": "2026-05-19", "source_type": "government"},
                {"name": "AP", "date_accessed": "2026-05-19", "source_type": "news"}
            ],
            "cross_references": []
        },
        {
            "region": "South Korea",
            "signal_type": "baseline",
            "severity": "observational",
            "headline": "MFDS AI-cops monitoring virtual endorsers",
            "what_changed": "Regulatory baselines steady. No new enforcement actions.",
            "creator_risk": "Virtual endorsers must maintain disclosure standards.",
            "creator_action": "Maintain AI disclosure. Monitor KFTC guidance.",
            "content_format_at_risk": ["virtual_endorser"],
            "sources": [
                {"name": "MFDS", "date_accessed": "2026-05-19", "source_type": "government"}
            ],
            "cross_references": []
        },
        {
            "region": "India",
            "signal_type": "baseline",
            "severity": "observational",
            "headline": "No new Gazette notifications for SGI labeling",
            "what_changed": "Regulatory baselines steady. Notification-watch continues.",
            "creator_risk": "Health creators must stay ready for SGI mandates.",
            "creator_action": "Monitor MeitY notifications.",
            "content_format_at_risk": ["health_advice"],
            "sources": [
                {"name": "MeitY", "date_accessed": "2026-05-19", "source_type": "government"}
            ],
            "cross_references": []
        }
    ],
    "market_intelligence": {
        "consolidation_signals": [
            {
                "pattern": "ai_voice_disclosure_gap",
                "regions_affected": ["Japan", "South Korea"],
                "description": "APAC markets beginning to enforce AI-content disclosure",
                "product_opportunity": "Cross-market AI-voice disclosure SaaS for creators",
                "urgency": "high",
                "first_detected": "2026-05-19",
                "event_count": 2,
                "trend_direction": "strengthening"
            }
        ],
        "arbitrage_signals": [
            {
                "description": "Indonesia lagging TikTok in transparency",
                "opportunity": "Third-party creator protection/insurance product for Indonesian market",
                "data_gap": "YouTube deactivation counts not public",
                "regions_affected": ["Indonesia"]
            }
        ],
        "emerging_themes": [
            {
                "theme": "Inauthentic Content Wave",
                "momentum": "building",
                "affected_markets": ["Japan"],
                "first_detected": "2026-05-19"
            }
        ]
    },
    "narrative": "Daily Signal Update: YouTube Health APAC (May 19, 2026). Source-first.\n\n1. Australia (Media Escalation): High-visibility reports linking influencers to peptide injuries.\n2. Japan (Creator Sentiment): AI-voice demonetization remains primary risk.\n3. Indonesia (Audit Phase): No change. June 6 deadline.\n4. South Korea & India: Baselines steady."
}

def seed_local():
    """Seed using direct database import (for local testing)."""
    import sys
    sys.path.insert(0, ".")
    from database import db
    
    for signal in [MAY_19_SIGNAL, MAY_20_SIGNAL]:
        db.insert_signal(signal)
        print(f"Seeded: {signal['signal_id']}")
    
    print(f"Total signals: {db.get_signal_count()}")

def seed_remote(base_url: str, api_key: str):
    """Seed via API endpoint."""
    headers = {"x-api-key": api_key, "Content-Type": "application/json"}
    
    for signal in [MAY_19_SIGNAL, MAY_20_SIGNAL]:
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