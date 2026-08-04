from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import Optional
from datetime import datetime
from app.models.report import EvidenceReport
from app.models.task import ModuleTask
from app.modules.shared.reporting.pdf_generator import generate_pdf
from app.core.exceptions import NotFoundError
import uuid


class ReportService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def generate_report(self, module_id: str, task_id: str, user_id: str,
                              title: Optional[str] = None, include_raw_data: bool = False) -> EvidenceReport:
        task_result = await self.db.execute(
            select(ModuleTask).where(ModuleTask.id == uuid.UUID(task_id))
        )
        task = task_result.scalar_one_or_none()
        if not task:
            raise NotFoundError("Task not found")
        report_title = title or f"{module_id.upper()} Evidence Report — {datetime.utcnow().strftime('%Y-%m-%d %H:%M')}"
        report_data = {
            "title": report_title, "module_id": module_id, "task_id": task_id,
            "generated_at": datetime.utcnow().isoformat(), "generated_by": user_id,
            "result": task.result_data, "input": task.input_data if include_raw_data else None,
        }
        file_path = await generate_pdf(module_id=module_id, data=report_data, report_id=str(uuid.uuid4()))
        report = EvidenceReport(module_id=module_id, task_id=uuid.UUID(task_id), generated_by=uuid.UUID(user_id),
                                title=report_title, summary=f"Evidence package from {module_id} module.",
                                file_path=file_path, report_metadata=report_data)
        self.db.add(report)
        await self.db.commit()
        await self.db.refresh(report)
        return report

    async def get_reports(self, module_id: Optional[str] = None, limit: int = 20) -> list:
        query = select(EvidenceReport)
        if module_id:
            query = query.where(EvidenceReport.module_id == module_id)
        query = query.order_by(EvidenceReport.created_at.desc()).limit(limit)
        result = await self.db.execute(query)
        return result.scalars().all()
