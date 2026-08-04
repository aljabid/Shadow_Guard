from app.modules.kolkhoz.module import KolkhozModule
from app.modules.droper.module import DroperModule
from app.modules.piramida.module import PiramidaModule
from app.modules.shadowbet.module import ShadowBetModule
from app.modules.tengraf.module import TengrafModule
from app.modules.contraband.module import ContrabandModule
from app.core.exceptions import NotFoundError, ValidationError

MODULE_REGISTRY = {
    "kolkhoz": KolkhozModule(),
    "droper": DroperModule(),
    "piramida": PiramidaModule(),
    "shadowbet": ShadowBetModule(),
    "tengraf": TengrafModule(),
    "contraband": ContrabandModule(),
}

FUTURE_MODULES = [
    {
        "id": "kz_deanon",
        "name": "KZ-DEANON",
        "description": "Citizen data leak darknet monitor",
        "status": "coming_soon",
    },
    {
        "id": "chaingraph",
        "name": "CHAIN-KZ",
        "description": "Blockchain wallet clustering and crypto flow intelligence",
        "status": "coming_soon",
    },
    {
        "id": "forge",
        "name": "ФОРЖ",
        "description": "Forgery and document fraud intelligence module",
        "status": "coming_soon",
    },
    {
        "id": "influencer",
        "name": "ИНФЛЮНСЕР",
        "description": "Influencer-driven scam promotion detection",
        "status": "coming_soon",
    },
    {
        "id": "fake_job_kz",
        "name": "FAKE JOB KZ",
        "description": "Fake job and recruitment scam intelligence",
        "status": "coming_soon",
    },
]


class ModuleDispatcher:
    def __init__(self):
        self.modules = MODULE_REGISTRY

    def list_modules(self):
        active = [
            {
                "id": module_id,
                "name": module.module_name,
                "version": module.module_version,
                "description": module.module_description,
                "status": "active",
            }
            for module_id, module in self.modules.items()
        ]

        return active + FUTURE_MODULES

    def get_module(self, module_id: str):
        module = self.modules.get(module_id)

        if not module:
            raise NotFoundError(f"Module not found: {module_id}")

        return module

    def validate_input(self, module_id: str, data: dict):
        module = self.get_module(module_id)

        if not module.validate_input(data):
            raise ValidationError(f"Invalid input for module: {module_id}")

        return True


module_dispatcher = ModuleDispatcher()
def list_modules():
    return module_dispatcher.list_modules()


def get_module(module_id: str):
    return module_dispatcher.get_module(module_id)


def validate_module_input(module_id: str, data: dict):
    return module_dispatcher.validate_input(module_id, data)