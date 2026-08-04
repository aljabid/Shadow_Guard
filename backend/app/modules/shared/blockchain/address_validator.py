import re
from typing import Literal

AddressType = Literal["tron", "ethereum", "bitcoin", "unknown"]


def detect_address_type(address: str) -> AddressType:
    if re.match(r"^T[A-Za-z0-9]{33}$", address):
        return "tron"
    if re.match(r"^0x[a-fA-F0-9]{40}$", address):
        return "ethereum"
    if re.match(r"^[13][a-km-zA-HJ-NP-Z1-9]{25,34}$", address):
        return "bitcoin"
    return "unknown"


def is_valid_address(address: str) -> bool:
    return detect_address_type(address) != "unknown"


def normalize_address(address: str) -> str:
    if detect_address_type(address) == "ethereum":
        return address.lower()
    return address
