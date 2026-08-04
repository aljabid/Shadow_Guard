from typing import List

KOLKHOZ_CONFIG = {
    "alert_threshold_high": 85,
    "alert_threshold_medium": 65,
    "scan_interval_seconds": 3600,
    "max_messages_per_channel": 200,
    "complaint_lookback_hours": 48,
    "wallet_lookback_days": 7,
}

WATCHED_EXCHANGES: List[dict] = [
    {
        "name": "RAKS Exchange",
        "telegram_channels": ["raks_exchange", "raks_support"],
        "wallets": [],
        "domain": "raks-exchange.com",
        "status": "historical",
        "note": "Dismantled Sep 2025 — used for playback demo",
    },
    {
        "name": "ShadowFX",
        "telegram_channels": ["shadowfx_kz"],
        "wallets": [],
        "domain": "shadowfx-kz.com",
        "status": "active",
    },
]

SIGNAL_WEIGHTS = {
    "complaint_surge": 0.30,
    "support_silence": 0.25,
    "wallet_outflow_drop": 0.25,
    "domain_downtime": 0.10,
    "social_deletion": 0.10,
}
