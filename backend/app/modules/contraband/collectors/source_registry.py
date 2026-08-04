from typing import Dict, List


def get_default_seed_sources() -> List[Dict]:
    """
    Seed sources for CONTRABAND-KZ.

    These are controlled demo/OSINT seeds. Real production crawling should use
    approved source lists, rate limits, and legal authorization.
    """

    return [
        {
            "source_type": "telegram",
            "source_name": "telegram_drug_watch_kz",
            "source_url": "https://t.me/drug_watch_kz_demo",
            "title": "Telegram courier recruitment Almaty",
            "text": (
                "Работа курьером Алматы, ежедневная оплата, адреса и точки. "
                "Писать @kz_courier_demo. Оплата USDT TRC20."
            ),
            "metadata": {
                "seed_type": "demo",
                "city": "almaty",
                "category_hint": "drug_courier_network",
            },
        },
        {
            "source_type": "darknet",
            "source_name": "darknet_market_kz_sim",
            "source_url": "darknet://market/kz-drug-vendor-001",
            "title": "DarkNet vendor Kazakhstan listings",
            "text": (
                "Vendor offers mephedrone, alpha-pvp and hash delivery in "
                "Almaty and Astana. Contact via Telegram @dark_kz_vendor."
            ),
            "metadata": {
                "seed_type": "demo",
                "city": "almaty",
                "category_hint": "drug_vendor",
            },
        },
        {
            "source_type": "public_web",
            "source_name": "public_vape_marketplace_sim",
            "source_url": "https://example.com/kz-vape-wholesale",
            "title": "Elf Bar HQD wholesale Kazakhstan",
            "text": (
                "Elf Bar, HQD, Lost Mary vape wholesale. Delivery in Almaty, "
                "Astana, Shymkent. Bulk orders without documents. Contact "
                "@vape_kz_wholesale."
            ),
            "metadata": {
                "seed_type": "demo",
                "city": "almaty",
                "category_hint": "vape_smuggling",
            },
        },
        {
            "source_type": "instagram",
            "source_name": "instagram_vape_promo_sim",
            "source_url": "https://instagram.com/vape_kz_demo",
            "title": "Instagram vape promo KZ",
            "text": (
                "Vape sale Kazakhstan. Lost Mary, Elfbar, Vozol. Delivery "
                "across Almaty. DM or Telegram @vape_fast_kz."
            ),
            "metadata": {
                "seed_type": "demo",
                "city": "almaty",
                "category_hint": "unlicensed_vape_sale",
            },
        },
        {
            "source_type": "telegram",
            "source_name": "telegram_alcohol_market_kz",
            "source_url": "https://t.me/alcohol_kz_demo",
            "title": "Alcohol wholesale without excise",
            "text": (
                "Алкоголь оптом, водка и коньяк без акциза. Доставка Алматы "
                "и Астана. Писать @alcohol_kz_demo, телефон +7 777 123 45 67."
            ),
            "metadata": {
                "seed_type": "demo",
                "city": "almaty",
                "category_hint": "alcohol_smuggling",
            },
        },
        {
            "source_type": "forum",
            "source_name": "forum_counterfeit_alcohol_sim",
            "source_url": "https://example.com/forum/counterfeit-alcohol-kz",
            "title": "Counterfeit alcohol supplier discussion",
            "text": (
                "Counterfeit alcohol supplier for Kazakhstan. Fake whiskey, "
                "cognac, vodka bulk boxes. Delivery to Karaganda and Shymkent."
            ),
            "metadata": {
                "seed_type": "demo",
                "city": "karaganda",
                "category_hint": "counterfeit_alcohol",
            },
        },
    ]


def get_source_groups() -> Dict[str, List[Dict]]:
    sources = get_default_seed_sources()

    groups: Dict[str, List[Dict]] = {
        "telegram": [],
        "darknet": [],
        "public_web": [],
        "instagram": [],
        "forum": [],
        "marketplace": [],
    }

    for source in sources:
        source_type = str(source.get("source_type") or "public_web")
        groups.setdefault(source_type, []).append(source)

    return groups


def get_sources_by_type(source_type: str) -> List[Dict]:
    groups = get_source_groups()
    return groups.get(source_type, [])


def get_enabled_sources(input_data: Dict | None = None) -> List[Dict]:
    input_data = input_data or {}

    enabled_types = input_data.get("source_types")

    if not enabled_types:
        return get_default_seed_sources()

    enabled_types = {str(item) for item in enabled_types}

    return [
        source
        for source in get_default_seed_sources()
        if str(source.get("source_type")) in enabled_types
    ]