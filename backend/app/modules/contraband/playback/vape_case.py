from typing import Dict


def get_vape_playback_case() -> Dict:
    return {
        "case_name": "Kazakhstan Illegal Vape Distribution",
        "case_type": "ILLEGAL_VAPE_MARKET",
        "mode": "playback",
        "alerts_fired": 2,
        "findings": [
            {
                "title": "Telegram Vape Distribution Channel",
                "crime_category": "ILLEGAL_VAPE_SALES",
                "risk_score": 91,
                "risk_level": "critical",
                "source_type": "telegram",
                "source_name": "@vape_kz_shop",
                "city": "Almaty",
                "country": "Kazakhstan",
                "evidence_priority": "critical",
                "analyst_summary": (
                    "Channel advertising prohibited vape products "
                    "with nationwide delivery."
                ),
                "entities": {
                    "telegram_handles": [
                        "@vape_kz_shop"
                    ],
                    "phones": [
                        "+77020000001"
                    ],
                    "brands": [
                        "HQD",
                        "Elf Bar"
                    ],
                    "locations": [
                        "Almaty"
                    ]
                },
                "recommended_actions": [
                    "Preserve channel evidence.",
                    "Map supplier infrastructure.",
                    "Identify payment channels."
                ]
            },
            {
                "title": "Instagram Vape Marketplace",
                "crime_category": "ILLEGAL_VAPE_MARKETING",
                "risk_score": 78,
                "risk_level": "high",
                "source_type": "instagram",
                "source_name": "@vape.delivery.kz",
                "city": "Shymkent",
                "country": "Kazakhstan",
                "evidence_priority": "high",
                "entities": {
                    "brands": [
                        "Lost Mary",
                        "Elf Bar"
                    ],
                    "locations": [
                        "Shymkent"
                    ]
                }
            }
        ]
    }