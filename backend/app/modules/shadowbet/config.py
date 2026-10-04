SHADOWBET_CONFIG = {
    "scan_interval_seconds": 7200,
    "max_channels_to_scan": 50,
    "high_risk_score_threshold": 70,
    "critical_score_threshold": 85,
}

GAMBLING_SEED_CHANNELS = [
    "mostbet_kz",
    "betwinner_kz",
    "stavki_kz",
    "casino_kz",
]

GAMBLING_KEYWORDS = [
    "ставки","bet","betting","казино","casino","букмекер","bookmaker",
    "слоты","slots","рулетка","roulette","покер","poker","выиграй",
    "джекпот","jackpot","бонус за регистрацию","фрибет","freebet",
    "коэффициент","odds","онлайн казино","игровые автоматы",
    "1xbet","melbet","mostbet","1win","pin up","pinup",
]

ILLEGAL_PLATFORM_NAMES = [
    "1xbet","melbet","mostbet","1win","pin-up","pinup",
    "betwinner","22bet","betway","parimatch",
]

AFFILIATE_PATTERNS = [
    r"ref=([a-zA-Z0-9_\-]+)",
    r"promo=([a-zA-Z0-9_\-]+)",
    r"промокод\s+([a-zA-Z0-9_\-]+)",
    r"promo[- ]?code[:\s]+([a-zA-Z0-9_\-]+)",
    r"реферальный код[:\s]+([a-zA-Z0-9_\-]+)",
    r"бонус[- ]?код[:\s]+([a-zA-Z0-9_\-]+)",
]

PLATFORM_SIGNAL_WEIGHTS = {
    "license_check": 0.35,
    "domain_clustering": 0.25,
    "payment_methods": 0.20,
    "influencer_reach": 0.20,
}
