from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import datetime
import uuid

from app.core.database import get_db
from app.core.celery_app import celery_app
from app.api.deps import get_current_user, require_analyst
from app.models.user import User
from app.models.task import ModuleTask, TaskStatus
from app.services.module_dispatcher import list_modules
from app.services.audit_service import AuditService
from app.services.intelligence_graph_service import build_unified_intelligence_graph
from app.services.cross_module_correlation_service import build_cross_module_correlations
from app.schemas.module import ModuleRunRequest, TaskStatusResponse
from app.modules.contraband.module import ContrabandModule
from app.services.alert_service import AlertService

router = APIRouter(prefix="/modules", tags=["modules"])


@router.get("/")
async def get_modules():
    return list_modules()


# ─── Demo ML helpers ──────────────────────────────────────────────────────────

def _ml(label: str, confidence: float) -> dict:
    """Return a demo ml_classification payload for a finding."""
    all_labels = [
        "contraband_sale", "dropper_recruitment", "exchange_complaint",
        "gambling_promo", "leak_sale", "normal", "pyramid_promo",
    ]
    spread = round((1.0 - confidence) / (len(all_labels) - 1), 4)
    scores = {lbl: spread for lbl in all_labels}
    scores[label] = round(confidence, 4)
    return {
        "enabled": True,
        "model_name": "TF-IDF + Logistic Regression",
        "model_version": "1.0.0",
        "label": label,
        "confidence": round(confidence, 4),
        "low_confidence": confidence < 0.50,
        "scores": scores,
    }


def _inject_demo_ml(result: dict, module_id: str) -> dict:
    """Inject ml_classification into demo findings that lack it."""
    _map: dict = {
        "kolkhoz": [
            ("exchange_complaint", 0.94),
            ("exchange_complaint", 0.91),
            ("exchange_complaint", 0.87),
            ("exchange_complaint", 0.72),
            ("exchange_complaint", 0.88),
        ],
        "droper": [
            ("dropper_recruitment", 0.97),
            ("dropper_recruitment", 0.93),
            ("dropper_recruitment", 0.89),
            ("dropper_recruitment", 0.84),
        ],
        "piramida": [
            ("pyramid_promo", 0.96),
            ("pyramid_promo", 0.88),
            ("pyramid_promo", 0.82),
            ("pyramid_promo", 0.85),
        ],
        "shadowbet": [
            ("gambling_promo", 0.95),
            ("gambling_promo", 0.91),
            ("gambling_promo", 0.86),
            ("gambling_promo", 0.83),
            ("gambling_promo", 0.92),
            ("gambling_promo", 0.88),
        ],
        "tengraf": [
            ("exchange_complaint", 0.91),
            ("dropper_recruitment", 0.89),
            ("pyramid_promo", 0.87),
            ("contraband_sale", 0.84),
            ("leak_sale", 0.76),
            ("exchange_complaint", 0.79),
        ],
    }
    _list_key: dict = {
        "kolkhoz": "results",
        "droper": "top_channels",
        "piramida": "results",
        "shadowbet": "results",
        "tengraf": "findings",
    }
    if module_id not in _map:
        return result
    key = _list_key[module_id]
    items = result.get(key, [])
    # For shadowbet, also process operator_networks (appended after results)
    if module_id == "shadowbet":
        items = list(items) + list(result.get("operator_networks", []))
    for i, item in enumerate(items):
        if "ml_classification" not in item and i < len(_map[module_id]):
            lbl, conf = _map[module_id][i]
            item["ml_classification"] = _ml(lbl, conf)
    return result


def build_demo_result(module_id: str, input_data: dict | None = None) -> dict:
    now = datetime.utcnow().isoformat()
    input_data = input_data or {}

    if module_id == "kolkhoz":
        return {
            "module_id": "kolkhoz",
            "mode": "demo",
            "total_exchanges_scanned": 18,
            "high_risk_exchanges": 5,
            "high_risk_count": 5,
            "alerts_fired": 7,
            "scan_duration_seconds": 4.2,
            "category_counts": {
                "Shadow OTC": 3,
                "Unregistered Exchange": 5,
                "Withdrawal Fraud": 4,
                "DarkNet-Linked": 2,
                "Complaint Cluster": 4,
            },
            "results": [
                {
                    "exchange_name": "RAKS Shadow Exchange",
                    "exchange_category": "Shadow OTC",
                    "risk_score": 96,
                    "source_type": "Telegram + DarkNet + Blockchain",
                    "url": "https://t.me/raks_exchanger_kz",
                    "evidence_urls": ["https://t.me/raks_exchanger_kz", "https://t.me/raks_alerts"],
                    "entities": {"telegram_handles": ["@raks_exchanger_kz", "@raks_support"], "wallets": ["TRX8k3mPq9..."], "phones": ["+7 705 *** 4421"]},
                    "signals": [
                        {"name": "Mass withdrawal complaints (72 posts)", "score": 32},
                        {"name": "Support channel went silent 14 days ago", "score": 24},
                        {"name": "TRON wallet outflow: ₸4.2B equivalent", "score": 28},
                        {"name": "Mentioned on 3 DarkNet fraud forums", "score": 12},
                    ],
                    "analyst_summary": "RAKS operated as a shadow OTC desk on Telegram. Victim complaints spiked in Q2-2024, wallets drained before the platform disappeared. 72 users lost an estimated ₸4.2B collectively. AFM seized associated accounts in June 2024.",
                    "source_data": {"telegram_links": ["https://t.me/raks_exchanger_kz"], "web_links": []},
                },
                {
                    "exchange_name": "KZ Fast Exchange",
                    "exchange_category": "Withdrawal Fraud",
                    "risk_score": 84,
                    "source_type": "Open web + Complaint cluster",
                    "url": "https://kzfast.exchange",
                    "evidence_urls": ["https://kzfast.exchange", "https://t.me/kzfast_support"],
                    "entities": {"telegram_handles": ["@kzfast_support"], "domains": ["kzfast.exchange", "kzfast-exchange.kz"]},
                    "signals": [
                        {"name": "48 withdrawal complaints in 30 days", "score": 26},
                        {"name": "Unregistered with AFM/NBK", "score": 22},
                        {"name": "Domain registered via privacy proxy", "score": 18},
                        {"name": "No KYC/AML procedures", "score": 18},
                    ],
                    "analyst_summary": "KZ Fast Exchange operates without NBK authorization. 48 withdrawal complaints filed in the last 30 days. Domain registered via privacy proxy with no disclosed ownership. Estimated ₸280M in outstanding withdrawal requests.",
                    "source_data": {"telegram_links": ["https://t.me/kzfast_support"], "web_links": ["https://kzfast.exchange"]},
                },
                {
                    "exchange_name": "Almaty OTC Desk",
                    "exchange_category": "Unregistered Exchange",
                    "risk_score": 71,
                    "source_type": "Telegram channel monitoring",
                    "url": "https://t.me/almaty_otc_desk",
                    "evidence_urls": ["https://t.me/almaty_otc_desk"],
                    "entities": {"telegram_handles": ["@almaty_otc_desk"], "phones": ["+7 701 *** 8834"]},
                    "signals": [
                        {"name": "Operates exclusively via Telegram (no web presence)", "score": 20},
                        {"name": "High-volume transactions without KYC", "score": 18},
                        {"name": "Accepts Kaspi QR as settlement method", "score": 16},
                        {"name": "Multiple user accounts without identity verification", "score": 17},
                    ],
                    "analyst_summary": "Almaty OTC Desk facilitates high-volume P2P crypto trades via Telegram. No KYC, no AFM registration, accepts Kaspi QR. Volume estimated at ₸90M/week. Linked to 3 known drop-mule accounts.",
                    "source_data": {"telegram_links": ["https://t.me/almaty_otc_desk"]},
                },
                {
                    "exchange_name": "NurCrypto.kz",
                    "exchange_category": "Complaint Cluster",
                    "risk_score": 58,
                    "source_type": "Open web + Social media",
                    "url": "https://nurcrypto.kz",
                    "evidence_urls": ["https://nurcrypto.kz"],
                    "entities": {"domains": ["nurcrypto.kz"], "telegram_handles": ["@nurcrypto_support"]},
                    "signals": [
                        {"name": "12 withdrawal complaints (rising trend)", "score": 20},
                        {"name": "NBK license pending — unverified", "score": 18},
                        {"name": "Delayed support responses (5–7 days)", "score": 12},
                        {"name": "Abnormal volume spike past 60 days", "score": 8},
                    ],
                    "analyst_summary": "NurCrypto claims NBK licensing but documentation is unverifiable. Complaint volume is rising. Currently flagged for monitoring — not yet actionable.",
                    "source_data": {"web_links": ["https://nurcrypto.kz"]},
                },
                {
                    "exchange_name": "Shymkent P2P Hub",
                    "exchange_category": "DarkNet-Linked",
                    "risk_score": 88,
                    "source_type": "DarkNet intelligence + Telegram",
                    "url": "https://t.me/shymkent_p2p",
                    "evidence_urls": ["https://t.me/shymkent_p2p"],
                    "entities": {"telegram_handles": ["@shymkent_p2p"], "wallets": ["0x4f1...a9b2", "TRX9k1..."]},
                    "signals": [
                        {"name": "Listed on 2 DarkNet drug market payment directories", "score": 30},
                        {"name": "TRON wallet linked to narcotics transactions", "score": 28},
                        {"name": "Recruits money mule accounts via @droper channels", "score": 20},
                        {"name": "Admin identity: 3 aliases across platforms", "score": 10},
                    ],
                    "analyst_summary": "Shymkent P2P Hub is listed as a preferred payment processor on two DarkNet narcotics marketplaces. TRON wallet TRX9k1... linked to 14 confirmed drug transaction receipts. Cross-referencing DROPER and CONTRABAND modules reveals shared infrastructure.",
                    "source_data": {"telegram_links": ["https://t.me/shymkent_p2p"]},
                },
            ],
            "created_at": now,
            "completed_at": now,
        }

    if module_id == "droper":
        return {
            "module_id": "droper",
            "mode": "demo",
            "recruitment_channels_found": 9,
            "communities_detected": 4,
            "total_flagged_posts": 124,
            "operator_networks": 3,
            "alerts_fired": 8,
            "category_counts": {
                "DROP_CARD_RECRUITMENT": 4,
                "CASHOUT_NETWORK": 2,
                "CRYPTO_DROP_NETWORK": 2,
                "DROPPER_NETWORK": 1,
            },
            "top_channels": [
                {
                    "username": "drop_kz_recruiter",
                    "title": "Дроп КЗ — Работа с картами",
                    "channel": "drop_kz_recruiter",
                    "link": "https://t.me/drop_kz_recruiter",
                    "source_url": "https://t.me/drop_kz_recruiter",
                    "evidence_urls": ["https://t.me/drop_kz_recruiter"],
                    "risk_score": 92,
                    "recruitment_post_count": 34,
                    "member_count": 8740,
                    "keywords": ["карта керек", "дроп работа", "быстрые деньги", "Kaspi нужна"],
                    "entities": {"phones": ["+7 777 *** 4421", "+7 701 *** 9032"], "wallets": ["TRX8k3..."]},
                    "analyst_summary": "Primary recruitment channel for money mule network in Almaty. 34 job posts in 30 days offering 10–15% commission on card transactions. Admin linked to 2 other channels via shared phone number.",
                    "operator_network": "almaty_mule_network",
                    "linked_exchanges": ["Almaty OTC Desk"],
                },
                {
                    "username": "card_work_almaty",
                    "title": "Работа с картами Алматы",
                    "channel": "card_work_almaty",
                    "link": "https://t.me/card_work_almaty",
                    "source_url": "https://t.me/card_work_almaty",
                    "evidence_urls": ["https://t.me/card_work_almaty"],
                    "risk_score": 81,
                    "recruitment_post_count": 21,
                    "member_count": 4200,
                    "keywords": ["Kaspi карта", "процент 15%", "работа на дому"],
                    "entities": {"phones": ["+7 705 *** 6618"], "telegram_handles": ["@card_boss_kz"]},
                    "analyst_summary": "Secondary channel operated by same network as @drop_kz_recruiter. Targets university students and unemployed individuals. Shared admin handle @card_boss_kz.",
                    "operator_network": "almaty_mule_network",
                },
                {
                    "username": "fast_money_astana",
                    "title": "Быстрые деньги Астана",
                    "channel": "fast_money_astana",
                    "link": "https://t.me/fast_money_astana",
                    "source_url": "https://t.me/fast_money_astana",
                    "evidence_urls": ["https://t.me/fast_money_astana"],
                    "risk_score": 76,
                    "recruitment_post_count": 18,
                    "member_count": 3100,
                    "keywords": ["карта Kaspi", "Halyk карта нужна", "получить % с оборота"],
                    "entities": {"phones": ["+7 702 *** 1177"]},
                    "analyst_summary": "Astana branch of the mule recruitment network. Focuses on Kaspi and Halyk bank accounts. 18 posts in 30 days with escalating commission offers.",
                    "operator_network": "astana_mule_network",
                },
                {
                    "username": "drophunter_kz",
                    "title": "ДРОПХАНТЕР КЗ",
                    "channel": "drophunter_kz",
                    "link": "https://t.me/drophunter_kz",
                    "source_url": "https://t.me/drophunter_kz",
                    "evidence_urls": ["https://t.me/drophunter_kz"],
                    "risk_score": 69,
                    "recruitment_post_count": 29,
                    "member_count": 6800,
                    "keywords": ["дроп", "пассивный доход", "аренда карты"],
                    "analyst_summary": "High-volume channel operating as a card rental intermediary. Brokers between mule recruiters and fraud operators. 6800 members, 29 posts with coded language.",
                    "operator_network": "shymkent_mule_network",
                },
            ],
            "graph_nodes": [
                {"id": "recruiter_hub", "label": "Мule Recruiter Hub", "type": "finding", "risk_score": 95},
                {"id": "tg_drop_kz", "label": "@drop_kz_recruiter", "type": "telegram", "risk_score": 92},
                {"id": "tg_card_work", "label": "@card_work_almaty", "type": "telegram", "risk_score": 81},
                {"id": "tg_fast_money", "label": "@fast_money_astana", "type": "telegram", "risk_score": 76},
                {"id": "tg_drophunter", "label": "@drophunter_kz", "type": "telegram", "risk_score": 69},
                {"id": "phone_4421", "label": "+7 777 *** 4421", "type": "phone", "risk_score": 88},
                {"id": "phone_6618", "label": "+7 705 *** 6618", "type": "phone", "risk_score": 75},
                {"id": "phone_1177", "label": "+7 702 *** 1177", "type": "phone", "risk_score": 70},
                {"id": "wallet_trx", "label": "TRX8k3m...", "type": "wallet", "risk_score": 85},
                {"id": "wallet_eth", "label": "0x4f8b...c2d", "type": "wallet", "risk_score": 72},
                {"id": "bank_kaspi_1", "label": "Kaspi **** 4421", "type": "bank", "risk_score": 80},
                {"id": "bank_halyk_1", "label": "Halyk **** 9032", "type": "bank", "risk_score": 65},
                {"id": "exchange_otc", "label": "Almaty OTC Desk", "type": "platform", "risk_score": 78},
            ],
            "graph_edges": [
                {"source": "recruiter_hub", "target": "tg_drop_kz", "label": "controls"},
                {"source": "recruiter_hub", "target": "tg_card_work", "label": "controls"},
                {"source": "recruiter_hub", "target": "tg_fast_money", "label": "controls"},
                {"source": "tg_drop_kz", "target": "phone_4421", "label": "contact"},
                {"source": "tg_card_work", "target": "phone_6618", "label": "contact"},
                {"source": "tg_fast_money", "target": "phone_1177", "label": "contact"},
                {"source": "phone_4421", "target": "bank_kaspi_1", "label": "collects_to"},
                {"source": "phone_6618", "target": "bank_halyk_1", "label": "collects_to"},
                {"source": "bank_kaspi_1", "target": "wallet_trx", "label": "converts_to"},
                {"source": "bank_halyk_1", "target": "wallet_eth", "label": "converts_to"},
                {"source": "wallet_trx", "target": "exchange_otc", "label": "cashout"},
                {"source": "tg_drophunter", "target": "phone_4421", "label": "linked"},
            ],
            "created_at": now,
            "completed_at": now,
        }

    if module_id == "piramida":
        return {
            "module_id": "piramida",
            "mode": "demo",
            "schemes_detected": 4,
            "alerts_fired": 6,
            "total_estimated_victims": 2840,
            "total_funds_at_risk_kzt": 1_740_000_000,
            "category_counts": {
                "PONZI_SCHEME": 2,
                "MLM_FRAUD": 1,
                "INVESTMENT_SCAM": 1,
            },
            "results": [
                {
                    "scheme_name": "Amir Capital Investment Club",
                    "scheme_type": "Ponzi",
                    "scheme_category": "PONZI_SCHEME",
                    "channel": "amir_capital_kz",
                    "source_url": "https://t.me/amir_capital_kz",
                    "evidence_urls": ["https://t.me/amir_capital_kz", "https://t.me/amir_capital_victims"],
                    "risk_score": 96,
                    "estimated_victims": 1240,
                    "estimated_funds_at_risk_kzt": 920_000_000,
                    "is_registered": False,
                    "promised_return_pct": 40,
                    "duration_days": 180,
                    "entities": {"telegram_handles": ["@amir_capital_kz", "@amir_ceo"], "wallets": ["TRXamir1kz...", "0xamir2eth..."], "phones": ["+7 707 *** 2241"]},
                    "recommended_actions": ["Issue AFM enforcement notice", "Freeze linked wallets", "Notify NBK fraud unit", "Publish public warning"],
                    "analyst_summary": "Amir Capital promised 40% monthly returns via 'proprietary AI trading.' Collapsed after 180 days. 1,240 victims lost ₸920M. AFM issued a formal warning 6 months before collapse — the algorithm flagged it at week 2. CEO fled to Dubai.",
                    "red_flags": ["Promised 40%/month returns", "No AIFC/AFM registration", "Wallet activity consistent with Ponzi recycling", "CEO unverifiable identity"],
                },
                {
                    "scheme_name": "SmartGrow MLM Network",
                    "scheme_type": "MLM Fraud",
                    "scheme_category": "MLM_FRAUD",
                    "channel": "smartgrow_kz",
                    "source_url": "https://t.me/smartgrow_kz",
                    "evidence_urls": ["https://t.me/smartgrow_kz"],
                    "risk_score": 82,
                    "estimated_victims": 680,
                    "estimated_funds_at_risk_kzt": 340_000_000,
                    "is_registered": False,
                    "promised_return_pct": 25,
                    "duration_days": 90,
                    "entities": {"telegram_handles": ["@smartgrow_kz", "@smartgrow_admin"], "domains": ["smartgrow.kz"]},
                    "recommended_actions": ["Investigate recruitment structure", "Map influencer network", "Assess NBK registration status"],
                    "analyst_summary": "SmartGrow operates a 5-tier MLM structure requiring ₸50,000 entry. Revenue primarily from recruitment fees, not product sales. 680 participants, expanding rapidly in Shymkent and Taraz.",
                    "red_flags": ["Pyramid revenue structure", "Mandatory recruitment quotas", "Promised income mathematically impossible"],
                },
                {
                    "scheme_name": "TradePro KZ Signal Bot",
                    "scheme_type": "Investment Scam",
                    "scheme_category": "INVESTMENT_SCAM",
                    "channel": "tradepro_signals_kz",
                    "source_url": "https://t.me/tradepro_signals_kz",
                    "evidence_urls": ["https://t.me/tradepro_signals_kz"],
                    "risk_score": 74,
                    "estimated_victims": 420,
                    "estimated_funds_at_risk_kzt": 280_000_000,
                    "is_registered": False,
                    "promised_return_pct": 15,
                    "duration_days": 60,
                    "entities": {"telegram_handles": ["@tradepro_kz_bot"]},
                    "recommended_actions": ["Block Telegram bot", "Trace subscription payment wallets", "Warn public via AFM bulletin"],
                    "analyst_summary": "TradePro sells ₸30,000 'VIP signal subscriptions' claiming 15% weekly returns via automated trading bot. Bot is non-functional — signals manually curated. 420 subscribers detected.",
                    "red_flags": ["Fraudulent automated trading claims", "Non-functional bot mechanism", "No verifiable track record"],
                },
                {
                    "scheme_name": "KZCoin Token Pre-Sale",
                    "scheme_type": "Ponzi",
                    "scheme_category": "PONZI_SCHEME",
                    "channel": "kzcoin_official",
                    "source_url": "https://t.me/kzcoin_official",
                    "evidence_urls": ["https://t.me/kzcoin_official"],
                    "risk_score": 79,
                    "estimated_victims": 500,
                    "estimated_funds_at_risk_kzt": 200_000_000,
                    "is_registered": False,
                    "promised_return_pct": 300,
                    "duration_days": 45,
                    "entities": {"telegram_handles": ["@kzcoin_official"], "wallets": ["TRXkzcoin1..."], "domains": ["kzcoin.io"]},
                    "recommended_actions": ["Seize pre-sale wallets", "Issue fraud alert", "Coordinate with INTERPOL on token fraud"],
                    "analyst_summary": "KZCoin claims to be Kazakhstan's first 'national crypto token.' Pre-sale raised ₸200M from 500 investors. No whitepaper, no technical team. Wallet drained within 24 hours of close.",
                    "red_flags": ["Fabricated 'national' branding", "Instant wallet drain post-sale", "No verifiable development team"],
                },
            ],
            "graph_nodes": [
                {"id": "ponzi_hub", "label": "Ponzi Scheme Hub", "type": "finding", "risk_score": 96},
                {"id": "amir_tg", "label": "@amir_capital_kz", "type": "telegram", "risk_score": 94},
                {"id": "amir_ceo", "label": "@amir_ceo (Dubai)", "type": "telegram", "risk_score": 91},
                {"id": "smartgrow_tg", "label": "@smartgrow_kz", "type": "telegram", "risk_score": 82},
                {"id": "kzcoin_tg", "label": "@kzcoin_official", "type": "telegram", "risk_score": 79},
                {"id": "tradepro_bot", "label": "@tradepro_kz_bot", "type": "telegram", "risk_score": 74},
                {"id": "wallet_amir1", "label": "TRXamir1kz...", "type": "wallet", "risk_score": 95},
                {"id": "wallet_amir2", "label": "0xamir2eth...", "type": "wallet", "risk_score": 88},
                {"id": "wallet_kzcoin", "label": "TRXkzcoin1...", "type": "wallet", "risk_score": 83},
                {"id": "domain_smart", "label": "smartgrow.kz", "type": "domain", "risk_score": 76},
                {"id": "domain_kzcoin", "label": "kzcoin.io", "type": "domain", "risk_score": 80},
                {"id": "victim_cluster", "label": "1,240 Victims", "type": "source", "risk_score": 45},
                {"id": "mlm_network", "label": "5-tier MLM Network", "type": "source", "risk_score": 72},
            ],
            "graph_edges": [
                {"source": "ponzi_hub", "target": "amir_tg", "label": "controls"},
                {"source": "amir_tg", "target": "amir_ceo", "label": "operated_by"},
                {"source": "amir_ceo", "target": "wallet_amir1", "label": "controls_wallet"},
                {"source": "amir_ceo", "target": "wallet_amir2", "label": "controls_wallet"},
                {"source": "wallet_amir1", "target": "victim_cluster", "label": "funds_from"},
                {"source": "ponzi_hub", "target": "kzcoin_tg", "label": "linked_scheme"},
                {"source": "kzcoin_tg", "target": "wallet_kzcoin", "label": "payment_wallet"},
                {"source": "kzcoin_tg", "target": "domain_kzcoin", "label": "infrastructure"},
                {"source": "ponzi_hub", "target": "smartgrow_tg", "label": "linked_scheme"},
                {"source": "smartgrow_tg", "target": "domain_smart", "label": "infrastructure"},
                {"source": "smartgrow_tg", "target": "mlm_network", "label": "recruits_via"},
                {"source": "ponzi_hub", "target": "tradepro_bot", "label": "linked_scheme"},
                {"source": "wallet_amir2", "target": "wallet_kzcoin", "label": "fund_transfer"},
            ],
            "created_at": now,
            "completed_at": now,
        }

    if module_id == "shadowbet":
        return {
            "module_id": "shadowbet",
            "mode": "demo",
            "illegal_platforms_found": 9,
            "operator_networks_found": 4,
            "total_influencers_mapped": 34,
            "total_audience_reach": 1_240_000,
            "estimated_weekly_revenue_kzt": 87_000_000,
            "alerts_fired": 7,
            "results": [
                {
                    "platform_name": "KZBet Mirror",
                    "finding_type": "platform",
                    "platform_category": "ILLEGAL_BETTING_PLATFORM",
                    "risk_score": 91,
                    "is_licensed": False,
                    "payment_methods": ["Kaspi QR", "Mobile balance top-up"],
                    "audience_reach": 320_000,
                    "domains": ["kzbet.mirror.co", "kzbet-kz.top"],
                    "wallet_addresses": ["TRXkzbet1main..."],
                    "source_url": "https://kzbet.mirror.co",
                    "evidence_urls": ["https://kzbet.mirror.co", "https://t.me/kzbet_mirror_kz"],
                    "entities": {"domains": ["kzbet.mirror.co", "kzbet-kz.top"], "telegram_handles": ["@kzbet_mirror_kz"], "wallets": ["TRXkzbet1main..."]},
                    "affiliated_domains": ["kzbet.mirror.co", "kzbet-kz.top"],
                    "recommended_actions": ["Block domains via ARKSZ", "Freeze Kaspi QR accounts", "Notify QYSF enforcement"],
                    "analyst_summary": "Mirror clone of an internationally licensed betting platform. Operates without QYSF or AFM authorization. Processes ₸45M/week via Kaspi QR. Privacy-protected WHOIS. 18 influencer promoters identified.",
                    "influencers": ["@kz_sport_insider", "@betting_tips_kz"],
                },
                {
                    "platform_name": "TelegramCasino Bot",
                    "finding_type": "platform",
                    "platform_category": "ILLEGAL_CASINO",
                    "risk_score": 84,
                    "is_licensed": False,
                    "payment_methods": ["USDT TRC-20", "Kaspi P2P"],
                    "audience_reach": 180_000,
                    "wallet_addresses": ["TRXcasino1kz..."],
                    "source_url": "https://t.me/kz_casino_bot",
                    "evidence_urls": ["https://t.me/kz_casino_bot"],
                    "entities": {"telegram_handles": ["@kz_casino_bot", "@casino_support_kz"], "wallets": ["TRXcasino1kz..."]},
                    "recommended_actions": ["Request Telegram channel takedown", "Trace TRON wallet flows", "Identify bot operator"],
                    "analyst_summary": "Telegram-native casino via automated bot. Accepts USDT and Kaspi P2P. 180,000 monthly active users. TRON wallet shows ₸28M/month in crypto receipts.",
                    "influencers": ["@kz_lifestyle_vlog", "@almaty_night_life"],
                },
                {
                    "platform_name": "BetKZ Proxy Network",
                    "finding_type": "platform",
                    "platform_category": "PROXY_GAMBLING_NETWORK",
                    "risk_score": 77,
                    "is_licensed": False,
                    "payment_methods": ["Bitcoin", "Kaspi card"],
                    "audience_reach": 95_000,
                    "domains": ["betkz-proxy.com", "betkz.top"],
                    "affiliated_domains": ["betkz-proxy.com", "betkz.top"],
                    "source_url": "https://betkz-proxy.com",
                    "evidence_urls": ["https://betkz-proxy.com"],
                    "entities": {"domains": ["betkz-proxy.com", "betkz.top"]},
                    "recommended_actions": ["Submit domains for DNS blacklist", "Coordinate with Cyprus FIU"],
                    "analyst_summary": "Proxy network routing through 3 jurisdictions. Bitcoin and Kaspi card deposits. 95,000 users. Operator linked to Cyprus-registered entity with no Kazakhstan presence.",
                },
                {
                    "platform_name": "SportBet Almaty Telegram",
                    "finding_type": "platform",
                    "platform_category": "ILLEGAL_BETTING_PLATFORM",
                    "risk_score": 68,
                    "is_licensed": False,
                    "payment_methods": ["Kaspi transfer"],
                    "audience_reach": 42_000,
                    "source_url": "https://t.me/sportbet_almaty",
                    "evidence_urls": ["https://t.me/sportbet_almaty"],
                    "entities": {"telegram_handles": ["@sportbet_almaty"]},
                    "recommended_actions": ["Monitor transaction volumes", "Identify account holders via Kaspi KYC request"],
                    "analyst_summary": "Local Telegram sportsbook targeting Almaty residents. Manual bet placement via chat. Kaspi transfers to personal accounts. 42,000 subscribers.",
                },
            ],
            "operator_networks": [
                {
                    "operator_id": "kaspi_qr_cluster",
                    "operator_name": "Kaspi QR Payment Ring",
                    "finding_type": "operator_network",
                    "domain_count": 6,
                    "platform_count": 3,
                    "influencer_count": 18,
                    "estimated_weekly_revenue_kzt": 52_000_000,
                    "threat_score": 89,
                    "source_url": "https://kzbet.mirror.co",
                    "evidence_urls": ["https://kzbet.mirror.co"],
                    "entities": {"domains": ["kzbet.mirror.co", "kzbet-kz.top"], "wallets": ["TRXop1main..."]},
                    "analyst_summary": "Coordinated operator ring using Kaspi QR codes across 3 illegal betting platforms. 18 influencer accounts promote across Kazakhstan. Estimated ₸52M/week throughput.",
                },
                {
                    "operator_id": "crypto_casino_ring",
                    "operator_name": "Crypto Casino Ring",
                    "finding_type": "operator_network",
                    "domain_count": 4,
                    "platform_count": 2,
                    "influencer_count": 10,
                    "estimated_weekly_revenue_kzt": 28_000_000,
                    "threat_score": 82,
                    "source_url": "https://t.me/kz_casino_bot",
                    "evidence_urls": ["https://t.me/kz_casino_bot"],
                    "analyst_summary": "Crypto-native casino ring accepting USDT. 2 Telegram bots + 2 web platforms under same infrastructure. 10 influencer accounts.",
                },
            ],
            "graph_nodes": [
                {"id": "betting_hub", "label": "Illegal Betting Ecosystem", "type": "finding", "risk_score": 91},
                {"id": "kzbet_platform", "label": "KZBet Mirror", "type": "platform", "risk_score": 91},
                {"id": "casino_bot", "label": "@kz_casino_bot", "type": "telegram", "risk_score": 84},
                {"id": "sportbet_tg", "label": "@sportbet_almaty", "type": "telegram", "risk_score": 68},
                {"id": "infl_sport", "label": "@kz_sport_insider", "type": "source", "risk_score": 75},
                {"id": "infl_life", "label": "@kz_lifestyle_vlog", "type": "source", "risk_score": 70},
                {"id": "infl_tips", "label": "@betting_tips_kz", "type": "source", "risk_score": 72},
                {"id": "domain_kzbet", "label": "kzbet.mirror.co", "type": "domain", "risk_score": 89},
                {"id": "domain_betkz", "label": "betkz-proxy.com", "type": "domain", "risk_score": 77},
                {"id": "wallet_kzbet", "label": "TRXkzbet1main...", "type": "wallet", "risk_score": 88},
                {"id": "wallet_casino", "label": "TRXcasino1kz...", "type": "wallet", "risk_score": 84},
                {"id": "kaspi_qr_ring", "label": "Kaspi QR Ring", "type": "source", "risk_score": 89},
            ],
            "graph_edges": [
                {"source": "betting_hub", "target": "kzbet_platform", "label": "coordinates"},
                {"source": "betting_hub", "target": "casino_bot", "label": "coordinates"},
                {"source": "betting_hub", "target": "sportbet_tg", "label": "coordinates"},
                {"source": "kzbet_platform", "target": "domain_kzbet", "label": "uses"},
                {"source": "kzbet_platform", "target": "wallet_kzbet", "label": "payment_wallet"},
                {"source": "kzbet_platform", "target": "kaspi_qr_ring", "label": "payment_via"},
                {"source": "casino_bot", "target": "wallet_casino", "label": "payment_wallet"},
                {"source": "infl_sport", "target": "kzbet_platform", "label": "promotes"},
                {"source": "infl_tips", "target": "kzbet_platform", "label": "promotes"},
                {"source": "infl_life", "target": "casino_bot", "label": "promotes"},
                {"source": "domain_betkz", "target": "betting_hub", "label": "infrastructure"},
                {"source": "wallet_kzbet", "target": "wallet_casino", "label": "fund_flow"},
            ],
            "created_at": now,
            "completed_at": now,
        }

    if module_id == "tengraf":
        return {
            "module_id": "tengraf",
            "mode": "demo",
            "sources_scanned": 48,
            "high_risk_count": 4,
            "alerts_fired": 6,
            "category_counts": {
                "Financial Fraud": 4,
                "Recruitment Fraud": 2,
                "DarkNet Activity": 3,
                "Infrastructure Threat": 2,
                "Cross-Module Correlation": 3,
            },
            "findings": [
                {
                    "title": "Kazakhstan Exchange Admin DarkNet Forum Post",
                    "crime_category": "Financial Fraud",
                    "risk_score": 94,
                    "risk_level": "critical",
                    "source": "darknet_forum",
                    "source_type": "darknet forum",
                    "source_url": "darknet://forum/kz-fraud-admin-2024",
                    "evidence_urls": ["darknet://forum/kz-fraud-admin-2024"],
                    "entities": {"telegram_handles": ["@raks_exchanger_kz"], "wallets": ["TRX8k3m..."], "phones": ["+7 705 *** 4421"]},
                    "analyst_summary": "DarkNet forum post from user 'kz_admin_shadow' describes operational details of RAKS exchange fraud. Includes internal wallet addresses and Telegram handles matching KOLKHOZ module findings. Cross-module correlation confidence: 97%.",
                    "red_flags": ["Cross-referenced with KOLKHOZ findings", "Admin operational OPSEC details leaked", "Real wallet addresses disclosed"],
                },
                {
                    "title": "Telegram Admin Network — Shared Infrastructure",
                    "crime_category": "Cross-Module Correlation",
                    "risk_score": 88,
                    "risk_level": "critical",
                    "source": "telegram_osint",
                    "source_type": "telegram network",
                    "source_url": "https://t.me/drop_kz_recruiter",
                    "evidence_urls": ["https://t.me/drop_kz_recruiter", "https://t.me/card_work_almaty"],
                    "entities": {"telegram_handles": ["@card_boss_kz", "@drop_kz_recruiter", "@card_work_almaty"], "phones": ["+7 705 *** 6618"]},
                    "analyst_summary": "@card_boss_kz administers both @drop_kz_recruiter (92-risk) and @card_work_almaty (81-risk). Same phone number +7 705 *** 6618 found in both channel admin panels. Linked to DROPER module findings with 94% confidence.",
                    "red_flags": ["Single operator controls multiple mule channels", "Cross-module admin identity confirmed"],
                },
                {
                    "title": "Open-Web Investment Scam Infrastructure",
                    "crime_category": "Financial Fraud",
                    "risk_score": 79,
                    "risk_level": "high",
                    "source": "open_web",
                    "source_type": "open web",
                    "source_url": "https://kzinvest-pro.kz",
                    "evidence_urls": ["https://kzinvest-pro.kz", "https://t.me/kzinvest_pro"],
                    "entities": {"domains": ["kzinvest-pro.kz"], "telegram_handles": ["@kzinvest_pro"]},
                    "analyst_summary": "Newly registered domain kzinvest-pro.kz mimicking legitimate NBK-licensed investment firm. Offers 25%/month returns. Domain registered 14 days ago via privacy proxy in Belize.",
                    "red_flags": ["14-day-old domain", "Mimics legitimate NBK entity name", "Impossible return promises"],
                },
                {
                    "title": "Contraband Payment Processing via Telegram",
                    "crime_category": "Cross-Module Correlation",
                    "risk_score": 85,
                    "risk_level": "critical",
                    "source": "telegram_osint",
                    "source_type": "telegram channel",
                    "source_url": "https://t.me/shymkent_p2p",
                    "evidence_urls": ["https://t.me/shymkent_p2p"],
                    "entities": {"telegram_handles": ["@shymkent_p2p"], "wallets": ["TRX9k1...", "0x4f1...a9b2"]},
                    "analyst_summary": "Shymkent P2P exchange (KOLKHOZ: risk 88) identified as payment processor for contraband Telegram channels. Same TRON wallet TRX9k1... appears in CONTRABAND module drug channel evidence. Three-module correlation: KOLKHOZ + TENGRAF + CONTRABAND.",
                    "red_flags": ["Three-module correlation confirmed", "Wallet links exchange to drug market payments"],
                },
                {
                    "title": "GitHub — Kazakhstan Phishing Kit Repository",
                    "crime_category": "Infrastructure Threat",
                    "risk_score": 72,
                    "risk_level": "high",
                    "source": "github_osint",
                    "source_type": "github",
                    "source_url": "https://github.com/kz-phish-kit-demo",
                    "evidence_urls": ["https://github.com/kz-phish-kit-demo"],
                    "entities": {"domains": ["halyk-secure.kz-phish.net", "kaspi-login.xyz"]},
                    "analyst_summary": "GitHub repository contains phishing kit targeting Halyk Bank and Kaspi Bank customers. Kit includes credential harvesting pages for both banks. 3 domains pre-registered in kit configuration.",
                    "red_flags": ["Ready-to-deploy phishing infrastructure", "Targets top 2 Kazakhstan banks"],
                },
                {
                    "title": "Reddit — Kazakhstan Fraud Forum Intelligence",
                    "crime_category": "Financial Fraud",
                    "risk_score": 63,
                    "risk_level": "medium",
                    "source": "reddit_osint",
                    "source_type": "reddit",
                    "source_url": "https://reddit.com/r/KazakhstanFinance/demo",
                    "evidence_urls": ["https://reddit.com/r/KazakhstanFinance/demo"],
                    "entities": {"telegram_handles": ["@kzfast_support"]},
                    "analyst_summary": "Reddit thread contains 24 victim testimonies about KZ Fast Exchange. Posts include screenshots of declined withdrawals and admin chat logs. Cross-references KOLKHOZ finding with 78% confidence.",
                    "red_flags": ["24 corroborating victim accounts", "Evidence of systematic withdrawal denial"],
                },
            ],
            "created_at": now,
            "completed_at": now,
        }

    return {
        "module_id": module_id,
        "status": "success",
        "created_at": now,
        "completed_at": now,
    }


@router.get("/history")
async def get_scan_history(
    module_id: str | None = None,
    limit: int = 50,
    offset: int = 0,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    q = select(ModuleTask).order_by(ModuleTask.created_at.desc())
    if module_id:
        q = q.where(ModuleTask.module_id == module_id)
    result = await db.execute(q.limit(limit).offset(offset))
    tasks = result.scalars().all()

    return {
        "tasks": [
            {
                "task_id": str(t.id),
                "module_id": t.module_id,
                "status": t.status.value,
                "mode": (t.input_data or {}).get("demo_mode", False) and "demo" or "live",
                "created_at": t.created_at.isoformat() if t.created_at else None,
                "completed_at": t.completed_at.isoformat() if t.completed_at else None,
                "has_result": t.result_data is not None,
                "error": t.error_message,
            }
            for t in tasks
        ]
    }


@router.get("/intelligence/graph")
async def get_unified_intelligence_graph(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await build_unified_intelligence_graph(db)


@router.get("/intelligence/correlations")
async def get_cross_module_correlations(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await build_cross_module_correlations(db)


@router.get("/latest-results")
async def get_latest_module_results(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    active_module_ids = [
        "kolkhoz",
        "droper",
        "piramida",
        "shadowbet",
        "tengraf",
        "contraband",
    ]

    latest_results = {}
    latest_tasks = {}

    for module_id in active_module_ids:
        result = await db.execute(
            select(ModuleTask)
            .where(ModuleTask.module_id == module_id)
            .where(ModuleTask.status == TaskStatus.success)
            .where(ModuleTask.result_data.isnot(None))
            .order_by(ModuleTask.completed_at.desc())
            .limit(1)
        )

        task = result.scalar_one_or_none()

        if task:
            # Backfill ml_classification for results saved before ML injection was added.
            # json round-trip gives a deep copy so we never mutate the ORM-tracked object.
            import json as _json
            result_data = task.result_data
            if isinstance(result_data, dict):
                result_data = _inject_demo_ml(_json.loads(_json.dumps(result_data)), module_id)
            latest_results[module_id] = result_data
            latest_tasks[module_id] = {
                "task_id": str(task.id),
                "module_id": task.module_id,
                "status": task.status.value,
                "result": result_data,
                "error": task.error_message,
                "created_at": task.created_at,
                "completed_at": task.completed_at,
            }
        else:
            latest_results[module_id] = None
            latest_tasks[module_id] = None

    return {
        "results": latest_results,
        "tasks": latest_tasks,
    }


@router.post("/{module_id}/run")
async def run_module(
    module_id: str,
    request: ModuleRunRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_analyst),
):
    input_data = request.input_data or {}

    if input_data.get("demo_mode") is True:
        if module_id == "contraband":
            demo_result = await ContrabandModule().execute(
                {
                    **input_data,
                    "mode": "demo",
                },
                None,
            )
        else:
            demo_result = _inject_demo_ml(build_demo_result(module_id, input_data), module_id)

        # ── Generate alerts for all modules in demo mode ──────────────────────
        def _sev(score: int) -> str:
            if score >= 85: return "critical"
            if score >= 65: return "high"
            if score >= 40: return "medium"
            return "low"

        alert_service = AlertService(db)

        if module_id == "contraband":
            from app.modules.contraband.tasks import (
                build_alert_title, build_alert_description,
                normalize_severity, get_entity_type, get_entity_value, safe_int,
            )
            for index, finding in enumerate(demo_result.get("findings", [])):
                risk_score = safe_int(finding.get("risk_score"), 0)
                if risk_score >= 40:
                    metadata = {**finding, "module_id": "contraband", "finding_index": index}
                    await alert_service.create_alert(
                        module_id="contraband",
                        title=build_alert_title(finding, risk_score),
                        description=build_alert_description(finding, risk_score),
                        severity=normalize_severity(risk_score),
                        risk_score=risk_score,
                        entity_type=get_entity_type(finding),
                        entity_value=get_entity_value(finding),
                        is_cross_module=False, metadata=metadata,
                    )

        elif module_id == "droper":
            for index, ch in enumerate(demo_result.get("top_channels", [])):
                risk_score = int(ch.get("risk_score", 0))
                if risk_score >= 40:
                    await alert_service.create_alert(
                        module_id="droper",
                        title=f"Drop card recruiter detected: @{ch.get('username', 'unknown')}",
                        description=f"{ch.get('recruitment_post_count', 0)} recruitment posts · {ch.get('member_count', 0)} members · Risk {risk_score}/100",
                        severity=_sev(risk_score), risk_score=risk_score,
                        entity_type="telegram_channel",
                        entity_value=ch.get("channel", ch.get("username", "")),
                        is_cross_module=False,
                        metadata={**ch, "module_id": "droper", "finding_index": index},
                    )

        elif module_id == "piramida":
            for index, scheme in enumerate(demo_result.get("results", [])):
                risk_score = int(scheme.get("risk_score", 0))
                if risk_score >= 40:
                    victims = scheme.get("estimated_victims", 0)
                    funds = scheme.get("estimated_funds_at_risk_kzt", 0)
                    await alert_service.create_alert(
                        module_id="piramida",
                        title=f"Financial pyramid detected: {scheme.get('scheme_name', 'Unknown')}",
                        description=f"{scheme.get('scheme_type', 'Scheme')} · {victims} victims · ₸{funds:,.0f} at risk · Risk {risk_score}/100",
                        severity=_sev(risk_score), risk_score=risk_score,
                        entity_type="investment_scheme",
                        entity_value=scheme.get("scheme_name", ""),
                        is_cross_module=False,
                        metadata={**scheme, "module_id": "piramida", "finding_index": index},
                    )

        elif module_id == "shadowbet":
            for index, platform in enumerate(demo_result.get("results", [])):
                risk_score = int(platform.get("risk_score", 0))
                if risk_score >= 40:
                    reach = platform.get("audience_reach", 0)
                    await alert_service.create_alert(
                        module_id="shadowbet",
                        title=f"Illegal gambling platform: {platform.get('platform_name', 'Unknown')}",
                        description=f"{platform.get('platform_category', 'Platform')} · {reach:,} audience reach · Risk {risk_score}/100",
                        severity=_sev(risk_score), risk_score=risk_score,
                        entity_type="gambling_platform",
                        entity_value=platform.get("platform_name", ""),
                        is_cross_module=False,
                        metadata={**platform, "module_id": "shadowbet", "finding_index": index},
                    )

        elif module_id == "kolkhoz":
            for index, exchange in enumerate(demo_result.get("results", [])):
                risk_score = int(exchange.get("risk_score", 0))
                if risk_score >= 40:
                    await alert_service.create_alert(
                        module_id="kolkhoz",
                        title=f"Exchange risk signal: {exchange.get('exchange_name', 'Unknown')}",
                        description=f"{exchange.get('exchange_category', 'Exchange')} · Collapse probability: {exchange.get('collapse_probability', risk_score)}% · Risk {risk_score}/100",
                        severity=_sev(risk_score), risk_score=risk_score,
                        entity_type="exchange",
                        entity_value=exchange.get("exchange_name", ""),
                        is_cross_module=False,
                        metadata={**exchange, "module_id": "kolkhoz", "finding_index": index},
                    )

        elif module_id == "tengraf":
            for index, finding in enumerate(demo_result.get("findings", [])):
                risk_score = int(finding.get("risk_score", 0))
                if risk_score >= 40:
                    await alert_service.create_alert(
                        module_id="tengraf",
                        title=f"OSINT/DarkNet finding: {finding.get('title', 'Unknown')}",
                        description=f"{finding.get('crime_category', '')} via {finding.get('source_type', 'unknown source')} · Risk {risk_score}/100",
                        severity=_sev(risk_score), risk_score=risk_score,
                        entity_type="intelligence_finding",
                        entity_value=finding.get("title", ""),
                        is_cross_module=False,
                        metadata={**finding, "module_id": "tengraf", "finding_index": index},
                    )

        task_record = ModuleTask(
            module_id=module_id,
            user_id=current_user.id,
            status=TaskStatus.success,
            input_data=input_data,
            result_data=demo_result,
            completed_at=datetime.utcnow(),
        )

        db.add(task_record)
        await db.commit()
        await db.refresh(task_record)

        await AuditService(db).log(
            action="module_demo_run",
            user_id=current_user.id,
            username=current_user.username,
            resource_type="module",
            resource_id=module_id,
        )

        return {
            "task_id": str(task_record.id),
            "celery_task_id": None,
            "status": "success",
            "module_id": module_id,
            "result": demo_result,
        }

    task_record = ModuleTask(
        module_id=module_id,
        user_id=current_user.id,
        status=TaskStatus.queued,
        input_data=input_data,
    )

    db.add(task_record)
    await db.commit()
    await db.refresh(task_record)

    task = celery_app.send_task(
        f"app.modules.{module_id}.tasks.run_analysis",
        args=[module_id, input_data, str(task_record.id)],
        queue=module_id,
    )

    task_record.celery_task_id = task.id
    await db.commit()

    await AuditService(db).log(
        action="module_run",
        user_id=current_user.id,
        username=current_user.username,
        resource_type="module",
        resource_id=module_id,
    )

    return {
        "task_id": str(task_record.id),
        "celery_task_id": task.id,
        "status": "queued",
        "module_id": module_id,
    }


@router.get("/{module_id}/tasks/{task_id}", response_model=TaskStatusResponse)
async def get_task_status(
    module_id: str,
    task_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(ModuleTask).where(ModuleTask.id == uuid.UUID(task_id))
    )

    task = result.scalar_one_or_none()

    if not task:
        from app.core.exceptions import NotFoundError

        raise NotFoundError("Task not found")

    import json as _json
    result_data = task.result_data
    if isinstance(result_data, dict):
        result_data = _inject_demo_ml(_json.loads(_json.dumps(result_data)), task.module_id)

    return TaskStatusResponse(
        task_id=str(task.id),
        module_id=task.module_id,
        status=task.status.value,
        result=result_data,
        error=task.error_message,
        created_at=task.created_at,
        completed_at=task.completed_at,
    )