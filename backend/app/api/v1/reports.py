from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import Optional, List
import os, uuid as uuidlib

from app.core.database import get_db
from app.api.deps import get_current_user, require_analyst
from app.models.user import User
from app.models.report import EvidenceReport
from app.services.report_service import ReportService
from app.schemas.report import ReportGenerateRequest, ReportResponse

router = APIRouter(prefix="/reports", tags=["reports"])


def to_report_response(report) -> ReportResponse:
    return ReportResponse(
        id=str(report.id),
        module_id=report.module_id,
        title=report.title,
        summary=report.summary,
        file_path=report.file_path,
        created_at=report.created_at,
    )


@router.post("/generate", response_model=ReportResponse)
async def generate_report(
    request: ReportGenerateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_analyst),
):
    report = await ReportService(db).generate_report(
        module_id=request.module_id,
        task_id=request.task_id,
        user_id=str(current_user.id),
        title=request.title,
        include_raw_data=request.include_raw_data,
    )

    return to_report_response(report)


@router.get("/", response_model=List[ReportResponse])
async def get_reports(
    module_id: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    reports = await ReportService(db).get_reports(module_id=module_id)
    return [to_report_response(report) for report in reports]


@router.get("/{report_id}/download")
async def download_report(
    report_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        rid = uuidlib.UUID(report_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid report ID")

    result = await db.execute(select(EvidenceReport).where(EvidenceReport.id == rid))
    report = result.scalar_one_or_none()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    if not report.file_path or not os.path.exists(report.file_path):
        raise HTTPException(status_code=404, detail="Report file not found on server")

    return FileResponse(
        path=report.file_path,
        filename=f"shadowguard_{report.module_id}_{report_id[:8]}_report.html",
        media_type="text/html",
    )