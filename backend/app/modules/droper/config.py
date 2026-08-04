from typing import List

DROPER_CONFIG = {
    "scan_interval_seconds": 7200,
    "max_messages_per_channel": 200,
    "min_recruitment_posts_for_alert": 5,
    "high_risk_channel_threshold": 70,
}

SEED_CHANNELS: List[str] = [
    "forcedropofficial",
    "easydropz",
    "Dropershoper",
]

RECRUITMENT_KEYWORDS = [
    "нужна карта","нужны карты","дроп","dropper","дропер",
    "обнал","обналичивание","карта на имя","карточка",
    "легкие деньги","лёгкий заработок","работа с картой",
    "процент с оборота","пассивный доход","карта kaspi",
    "карта halyk","карта forte","нужен счет","нужен дроп",
    "ищем дропов","работа для карты","сдай карту",
    "аренда карты","продай карту","карта за процент",
]

BANK_NAMES = [
    "kaspi","каспи","halyk","халык","forte","форте",
    "jusan","жусан","bereke","береке","centercredit",
    "центркредит","sberbank","сбербанк","tinkoff","тинькофф",
]
