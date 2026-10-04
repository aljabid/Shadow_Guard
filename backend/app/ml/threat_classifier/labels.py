"""Canonical label definitions for the ShadowGuard Threat Classifier."""

LABELS = [
    "dropper_recruitment",
    "exchange_complaint",
    "pyramid_promo",
    "gambling_promo",
    "contraband_sale",
    "leak_sale",
    "normal",
]

LABEL_DESCRIPTIONS = {
    "dropper_recruitment": "Card dropper / money mule recruitment (дроп-карты, обнал)",
    "exchange_complaint":  "Crypto/fiat exchange withdrawal complaint (кидалово, обменник скам)",
    "pyramid_promo":       "Investment pyramid / Ponzi scheme promotion (пассивный доход, реферальная программа)",
    "gambling_promo":      "Illegal online gambling advertisement (1win, mostbet, казино без лицензии)",
    "contraband_sale":     "Contraband sale: drugs, unlicensed vape/alcohol (закладки, меф, вейп опт)",
    "leak_sale":           "Stolen data / database leak sale (слив базы, cvv, дамп карт)",
    "normal":              "Benign / unrelated message",
}

# Index ↔ label mappings (for serialisation)
LABEL_TO_IDX = {label: i for i, label in enumerate(LABELS)}
IDX_TO_LABEL = {i: label for i, label in enumerate(LABELS)}
