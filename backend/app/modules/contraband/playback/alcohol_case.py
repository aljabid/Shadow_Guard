from typing import Dict


def get_alcohol_playback_case() -> Dict:
    return {
        "case_name": "Illegal Alcohol Distribution Network",
        "case_type": "ILLEGAL_ALCOHOL_MARKET",
        "mode": "playback",
        "alerts_fired": 2,
        "findings": [
            {
                "title": "Telegram Alcohol Delivery Service",
                "crime_category": "ILLEGAL_ALCOHOL_SALES",
                "risk_score": 89,
                "risk_level": "critical",
                "source_type": "telegram",
                "source_name": "@alco_delivery_kz",
                "city": "Almaty",
                "country": "Kazakhstan",
                "evidence_priority": "critical",
                "analyst_summary": (
                    "Channel offering unlicensed alcohol delivery "
                    "through courier networks."
                ),
                "entities": {
                    "telegram_handles": [
                        "@alco_delivery_kz"
                    ],
                    "phones": [
                        "+77030000001"
                    ],
                    "brands": [
                        "Jack Daniels",
                        "Hennessy",
                        "Absolut"
                    ],
                    "locations": [
                        "Almaty"
                    ]
                },
                "recommended_actions": [
                    "Preserve evidence immediately.",
                    "Identify payment infrastructure.",
                    "Map courier network."
                ]
            },
            {
                "title": "DarkNet Alcohol Supplier",
                "crime_category": "CONTRABAND_ALCOHOL",
                "risk_score": 74,
                "risk_level": "high",
                "source_type": "darknet",
                "source_name": "spirits_vendor",
                "city": "Astana",
                "country": "Kazakhstan",
                "evidence_priority": "high",
                "entities": {
                    "wallets": [
                        "BTC_ALCOHOL_SAMPLE"
                    ],
                    "locations": [
                        "Astana"
                    ]
                }
            }
        ]
    }