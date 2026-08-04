TENGRAF_KEYWORDS = [
    # Kazakhstan core
    "kazakhstan", "казахстан", "kz", "қазақстан",
    "kaspi", "каспи", "halyk", "халык", "forte", "форте",
    "jusan", "жусан", "bcc", "centercredit", "bereke", "freedom finance",
    "kzt", "tenge", "тенге",
    "almaty", "алматы", "astana", "астана", "shymkent", "шымкент",
    "nur-sultan", "нур-sultan",
    # Identity & credential leaks
    "iin", "иин", "жсн", "idcard kz", "egov.kz",
    "kaspi logs", "halyk logs", "forte logs",
    "bank logs", "logs kz", "fullz kz",
    "cvv kz", "cc kz", "dumps kz",
    "credential dump", "database leak", "db dump", "data breach",
    "user database", "пароль база", "утечка базы",
    # KZ phone prefixes (in leak context)
    "+7 701", "+7 702", "+7 705", "+7 707", "+7 708",
    "+7 747", "+7 771", "+7 775", "+7 776", "+7 777",
    # KZ email domains
    "@gov.kz", "@mail.kz", "@kgd.gov.kz", "@akimat", "@enbek.kz",
    "@egov.kz", "@kz", ".kz domain",
    # Card & payment fraud
    "kaspi gold", "kaspi card", "drop card kz",
    "card кз", "карточки кз", "drop карты",
    "cashout kz", "кэшаут кз", "обнал кз",
    # Dropper networks
    "drop", "droper", "дроп", "дропер",
    "drop card", "дроп карта", "drop network",
    "money mule", "мул", "денежный мул",
    "recruitment kz", "рекрутинг", "работа курьер",
    "кладмен", "закладки",
    # Crypto & wallets
    "usdt", "btc", "bitcoin", "tron", "trx",
    "crypto exchange", "обменник", "p2p exchange",
    "wallet kz", "кошелёк кз", "крипта кз",
    "trc20", "erc20", "binance kz",
    "dirty wallet", "flagged wallet", "blacklist wallet",
    # Illegal betting
    "1win", "1xbet", "mostbet", "betwinner", "melbet",
    "pin-up", "olimpbet", "bk kz", "ставки кз",
    "illegal betting", "нелегальные ставки",
    "betting kz", "казино кз", "casino kz",
    # Investment scams / pyramid
    "investment scam", "финансовая пирамида", "pyramid scheme",
    "guaranteed profit", "гарантированный доход",
    "passive income", "пассивный доход",
    "20 percent monthly", "20% в месяц",
    "amir capital", "raks", "инвестиционная схема",
    # Contraband
    "контрабанда кз", "smuggling kz", "вейп кз",
    "elfbar kz", "hqd kz", "lost mary kz",
    "алкоголь оптом", "паль алкоголь",
    "мефедрон", "альфа пвп", "наркотики кз",
    "drug kz", "клад", "кладмен кз",
    # DarkNet/OSINT signals
    "darknet kz", "даркнет кз", "onion kz",
    "telegram seller kz", "telegram traffic kz",
    "telegram ads kz", "kz hacker", "взлом кз",
]

BANK_KEYWORDS = [
    "kaspi", "halyk", "forte", "jusan", "bcc",
    "centercredit", "bereke", "freedom", "nurbank",
    "sberbank kz", "kcb", "shinhan kz",
]

PLATFORM_KEYWORDS = [
    "1win", "1xbet", "mostbet", "melbet", "betwinner",
    "pin-up", "olimpbet", "parimatch kz", "winline kz",
]

TELEGRAM_SEEDS = [
    "easydropz",
    "techdrop",
    "Dropershoper",
    "forcedropofficial",
    "crypto_invest_kz",
    "time_to_invest_channel",
    "mostbet_kz",
    "betwinner_kz",
    "kz_dark_market",
    "dumpskz",
    "kz_logs_shop",
]

PUBLIC_OSINT_URLS = [
    "https://kz-cert.kz/en/",
    "https://afsa.kz/en/",
    "https://www.gov.kz/",
    "https://finreg.kz/en/",
    "https://afm.gov.kz/",
    "https://www.nationalbank.kz/en/",
    "https://www.interpol.int/en/Crimes/Financial-crime",
]

SEARCH_SEEDS = [
    "Kaspi leak Kazakhstan",
    "Kaspi logs buy",
    "Kazakhstan drop cards",
    "Kazakhstan money mule",
    "Mostbet Kazakhstan database",
    "1win Kazakhstan user data",
    "Financial pyramid Kazakhstan",
    "egov.kz breach",
    "Halyk bank credentials",
    "Forte bank dump kz",
    "kaspi fullz кз купить",
    "базы данных казахстан слив",
    "дроп карты казахстан",
]

# Real .onion research seeds — publicly documented, legally accessible research nodes
# Tor must be running at socks5://127.0.0.1:9050 for these to resolve
ONION_SEED_URLS = [
    # Tor Project's own hidden service (safe, legitimate)
    "http://2gzyxa5ihm7nsggfxnu52rck2vv4rvmdlkiu3zzui5du4xyclen53wid.onion/",
    # DuckDuckGo .onion (safe, legitimate search)
    "https://duckduckgogg42xjoc72x3sjasowoarfbgcmvfimaftt6twagswzczad.onion/",
    # ProPublica .onion (journalism/research, legitimate)
    "https://p53lf57qovyuvwsc6xnrppyply3vtqm7l6pcobkmyqg6uuilsgebbo.onion/",
    # SecureDrop (whistleblower platform — for detecting insider leaks)
    "http://sdolvtfhatvsysc6l34d65ymdwxcujausv7k5jk4cy5ttzhjoi6fzvyd.onion/",
    # Riseup .onion (activist/leak communications)
    "http://vww6ybal4bd7szmgncyruucpgfkqahzddi37ktceo3ah7ngmcopnpyyd.onion/",
]

RISK_THRESHOLDS = {
    "medium":   40,
    "high":     70,
    "critical": 85,
}

MAX_FINDINGS          = 50
MAX_TELEGRAM_CHANNELS = 10
MAX_REDDIT_POSTS      = 20
MAX_GITHUB_RESULTS    = 20
MAX_SEARCH_RESULTS    = 20

SOURCE_TYPES = [
    "telegram",
    "reddit",
    "github",
    "public_web",
    "search_engine",
    "tor_onion",
    "forum",
    "marketplace",
    "leak_site",
    "paste_site",
    "code_repository",
]

# Kazakhstan-specific pattern constants
KZ_IIN_REGEX        = r"\b[0-9]{12}\b"
KZ_PHONE_REGEX      = r"\+7\s?7[0-9]{2}[\s\-]?[0-9]{3}[\s\-]?[0-9]{4}"
KZ_CARD_REGEX       = r"\b4[0-9]{3}[\s\-]?[0-9]{4}[\s\-]?[0-9]{4}[\s\-]?[0-9]{4}\b"
KZ_EMAIL_REGEX      = r"[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]*\.kz"
KZ_GOV_EMAIL_REGEX  = r"[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]*\.gov\.kz"
