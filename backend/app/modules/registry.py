from typing import Dict
from app.modules.base import BaseModule

_registry: Dict[str, BaseModule] = {}


def register(module: BaseModule):
    _registry[module.module_id] = module


def get(module_id: str) -> BaseModule:
    return _registry.get(module_id)


def all_modules() -> Dict[str, BaseModule]:
    return _registry
