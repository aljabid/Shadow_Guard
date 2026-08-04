PIRAMIDA_CONFIG = {
    "scan_interval_seconds": 3600,
    "max_messages_per_channel": 200,
    "high_risk_score_threshold": 70,
    "critical_score_threshold": 85,
    "min_return_rate_flag": 3.0,
    "critical_return_rate": 10.0,
}

INVESTMENT_SEED_CHANNELS = [
    "crypto_invest_kz",
    "time_to_invest_channel",
    "zarabotok_kz",
    "forex_kz",
]

PYRAMID_SIGNAL_WEIGHTS = {
    "return_promise": 0.30,
    "registration_validity": 0.25,
    "blockchain_activity": 0.20,
    "referral_structure": 0.15,
    "recruitment_velocity": 0.10,
}
