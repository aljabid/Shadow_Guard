from abc import ABC, abstractmethod


class BaseModule(ABC):
    module_id: str
    module_name: str
    module_version: str
    module_description: str

    @abstractmethod
    def validate_input(self, data: dict) -> bool:
        pass

    @abstractmethod
    async def execute(self, data: dict, task_id: str) -> dict:
        pass

    @abstractmethod
    def format_output(self, raw_result: dict) -> dict:
        pass

    def get_metadata(self) -> dict:
        return {
            "id": self.module_id,
            "name": self.module_name,
            "version": self.module_version,
            "description": self.module_description,
        }
