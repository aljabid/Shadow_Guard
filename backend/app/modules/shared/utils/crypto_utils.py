import hashlib
import base64
from typing import Optional


def sha256_hash(data: str) -> str:
    return hashlib.sha256(data.encode()).hexdigest()


def mask_sensitive(value: str, visible_chars: int = 6) -> str:
    if len(value) <= visible_chars * 2:
        return "***"
    return value[:visible_chars] + "***" + value[-visible_chars:]


def encode_entity_id(entity_type: str, entity_value: str) -> str:
    raw = f"{entity_type}:{entity_value}"
    return base64.urlsafe_b64encode(raw.encode()).decode()


def decode_entity_id(encoded: str) -> Optional[tuple]:
    try:
        raw = base64.urlsafe_b64decode(encoded.encode()).decode()
        parts = raw.split(":", 1)
        if len(parts) == 2:
            return parts[0], parts[1]
    except Exception:
        pass
    return None
