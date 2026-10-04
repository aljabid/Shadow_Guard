from typing import Dict


def get_drug_playback_case() -> Dict:
    return {
        "case_name": "Almaty Synthetic Drug Network",
        "case_type": "DRUG_DISTRIBUTION",
        "mode": "playback",
        "alerts_fired": 3,
        "findings": [
            {
                "title": "Telegram Drug Distribution Channel",
                "crime_category": "DRUG_TRAFFICKING",
                "risk_score": 96,
                "risk_level": "critical",
                "source_type": "telegram",
                "source_name": "@almaty_shop",
                "city": "Almaty",
                "country": "Kazakhstan",
                "evidence_priority": "critical",
                "analyst_summary": (
                    "Large-scale synthetic drug distribution channel "
                    "offering courier delivery and crypto payments."
                ),
                "entities": {
                    "telegram_handles": [
                        "@almaty_shop",
                        "@manager_24"
                    ],
                    "wallets": [
                        "TRC20_USDT_SAMPLE_1"
                    ],
                    "phones": [
                        "+77010000001"
                    ],
                    "locations": [
                        "Almaty"
                    ],
                    "substances": [
                        "mephedrone",
                        "alpha-pvp"
                    ]
                },
                "recommended_actions": [
                    "Escalate immediately.",
                    "Preserve Telegram evidence.",
                    "Trace linked wallets."
                ]
            },
            {
                "title": "Courier Drop Coordination",
                "crime_category": "DRUG_DROP_NETWORK",
                "risk_score": 88,
                "risk_level": "critical",
                "source_type": "telegram",
                "source_name": "@drop_manager",
                "city": "Karaganda",
                "country": "Kazakhstan",
                "evidence_priority": "high",
                "analyst_summary": (
                    "Recruitment of couriers and stash operators."
                ),
                "entities": {
                    "telegram_handles": [
                        "@drop_manager"
                    ],
                    "locations": [
                        "Karaganda"
                    ]
                }
            },
            {
                "title": "DarkNet Vendor Advertisement",
                "crime_category": "DARKNET_DRUG_MARKET",
                "risk_score": 82,
                "risk_level": "high",
                "source_type": "darknet",
                "source_name": "market_vendor",
                "city": "Astana",
                "country": "Kazakhstan",
                "evidence_priority": "high",
                "entities": {
                    "wallets": [
                        "BTC_SAMPLE_ADDRESS"
                    ]
                }
            }
        ]
    }