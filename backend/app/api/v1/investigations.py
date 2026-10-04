from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from typing import Optional
from datetime import datetime
import uuid

from app.core.database import get_db
from app.api.deps import get_current_user, require_analyst
from app.models.user import User
from app.models.investigation import Investigation, InvestigationStatus

router = APIRouter(prefix="/investigations", tags=["investigations"])


@router.get("/")
async def list_investigations(
    status: Optional[str] = Query(None),
    module_id: Optional[str] = Query(None),
    risk_level: Optional[str] = Query(None),
    limit: int = Query(50, le=200),
    offset: int = Query(0),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    q = select(Investigation).order_by(desc(Investigation.created_at))

    if status:
        try:
            q = q.where(Investigation.status == InvestigationStatus(status))
        except ValueError:
            pass

    if risk_level:
        q = q.where(Investigation.risk_level == risk_level)

    result = await db.execute(q.limit(limit).offset(offset))
    investigations = result.scalars().all()

    items = []
    for inv in investigations:
        module_ids = inv.module_ids or []
        if module_id and module_id not in module_ids:
            continue
        findings = inv.findings_snapshot or []
        items.append({
            "id": str(inv.id),
            "title": inv.title,
            "description": inv.description,
            "module_ids": module_ids,
            "status": inv.status.value,
            "risk_level": inv.risk_level,
            "tags": inv.tags or [],
            "findings_count": len(findings),
            "linked_task_ids": inv.linked_task_ids or [],
            "entity_summary": inv.entity_summary,
            "created_by": str(inv.created_by),
            "created_by_username": inv.created_by_username,
            "assigned_to": inv.assigned_to,
            "analyst_notes": inv.analyst_notes,
            "created_at": inv.created_at.isoformat() if inv.created_at else None,
            "updated_at": inv.updated_at.isoformat() if inv.updated_at else None,
        })

    return {"investigations": items, "total": len(items)}


@router.post("/")
async def create_investigation(
    body: dict,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_analyst),
):
    risk_level = body.get("risk_level", "medium")
    if not risk_level:
        findings = body.get("findings_snapshot") or []
        scores = [f.get("risk_score", 0) for f in findings if isinstance(f, dict)]
        max_score = max(scores) if scores else 0
        if max_score >= 80:
            risk_level = "critical"
        elif max_score >= 60:
            risk_level = "high"
        elif max_score >= 40:
            risk_level = "medium"
        else:
            risk_level = "low"

    inv = Investigation(
        title=body.get("title", "Untitled Investigation"),
        description=body.get("description"),
        module_ids=body.get("module_ids") or [],
        status=InvestigationStatus.open,
        risk_level=risk_level,
        tags=body.get("tags") or [],
        findings_snapshot=body.get("findings_snapshot") or [],
        linked_task_ids=body.get("linked_task_ids") or [],
        entity_summary=body.get("entity_summary"),
        created_by=current_user.id,
        created_by_username=current_user.username,
        assigned_to=body.get("assigned_to"),
        analyst_notes=body.get("analyst_notes"),
    )
    db.add(inv)
    await db.commit()
    await db.refresh(inv)

    return {
        "id": str(inv.id),
        "title": inv.title,
        "status": inv.status.value,
        "risk_level": inv.risk_level,
        "created_at": inv.created_at.isoformat() if inv.created_at else None,
    }


@router.get("/{investigation_id}")
async def get_investigation(
    investigation_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Investigation).where(Investigation.id == uuid.UUID(investigation_id))
    )
    inv = result.scalar_one_or_none()
    if not inv:
        from app.core.exceptions import NotFoundError
        raise NotFoundError("Investigation not found")

    findings = inv.findings_snapshot or []
    return {
        "id": str(inv.id),
        "title": inv.title,
        "description": inv.description,
        "module_ids": inv.module_ids or [],
        "status": inv.status.value,
        "risk_level": inv.risk_level,
        "tags": inv.tags or [],
        "findings_snapshot": findings,
        "findings_count": len(findings),
        "linked_task_ids": inv.linked_task_ids or [],
        "entity_summary": inv.entity_summary,
        "created_by": str(inv.created_by),
        "created_by_username": inv.created_by_username,
        "assigned_to": inv.assigned_to,
        "analyst_notes": inv.analyst_notes,
        "evidence_package_path": inv.evidence_package_path,
        "created_at": inv.created_at.isoformat() if inv.created_at else None,
        "updated_at": inv.updated_at.isoformat() if inv.updated_at else None,
    }


@router.put("/{investigation_id}")
async def update_investigation(
    investigation_id: str,
    body: dict,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_analyst),
):
    result = await db.execute(
        select(Investigation).where(Investigation.id == uuid.UUID(investigation_id))
    )
    inv = result.scalar_one_or_none()
    if not inv:
        from app.core.exceptions import NotFoundError
        raise NotFoundError("Investigation not found")

    for field in ["title", "description", "risk_level", "tags", "assigned_to", "analyst_notes"]:
        if field in body:
            setattr(inv, field, body[field])

    if "status" in body:
        try:
            inv.status = InvestigationStatus(body["status"])
        except ValueError:
            pass

    if "findings_snapshot" in body:
        inv.findings_snapshot = body["findings_snapshot"]

    if "linked_task_ids" in body:
        inv.linked_task_ids = body["linked_task_ids"]

    if "module_ids" in body:
        inv.module_ids = body["module_ids"]

    if "entity_summary" in body:
        inv.entity_summary = body["entity_summary"]

    inv.updated_at = datetime.utcnow()
    await db.commit()

    return {"id": str(inv.id), "status": inv.status.value, "updated": True}


@router.delete("/{investigation_id}")
async def delete_investigation(
    investigation_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_analyst),
):
    result = await db.execute(
        select(Investigation).where(Investigation.id == uuid.UUID(investigation_id))
    )
    inv = result.scalar_one_or_none()
    if not inv:
        from app.core.exceptions import NotFoundError
        raise NotFoundError("Investigation not found")

    await db.delete(inv)
    await db.commit()
    return {"deleted": True}


@router.post("/{investigation_id}/close")
async def close_investigation(
    investigation_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_analyst),
):
    result = await db.execute(
        select(Investigation).where(Investigation.id == uuid.UUID(investigation_id))
    )
    inv = result.scalar_one_or_none()
    if not inv:
        from app.core.exceptions import NotFoundError
        raise NotFoundError("Investigation not found")

    inv.status = InvestigationStatus.closed
    inv.updated_at = datetime.utcnow()
    await db.commit()
    return {"id": str(inv.id), "status": "closed"}


@router.post("/{investigation_id}/add-finding")
async def add_finding(
    investigation_id: str,
    body: dict,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_analyst),
):
    result = await db.execute(
        select(Investigation).where(Investigation.id == uuid.UUID(investigation_id))
    )
    inv = result.scalar_one_or_none()
    if not inv:
        from app.core.exceptions import NotFoundError
        raise NotFoundError("Investigation not found")

    findings = list(inv.findings_snapshot or [])
    findings.append(body.get("finding", {}))
    inv.findings_snapshot = findings

    module_ids = list(inv.module_ids or [])
    new_mod = body.get("module_id")
    if new_mod and new_mod not in module_ids:
        module_ids.append(new_mod)
    inv.module_ids = module_ids

    inv.updated_at = datetime.utcnow()
    await db.commit()

    return {"findings_count": len(findings)}
