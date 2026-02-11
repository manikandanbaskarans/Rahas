import uuid

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_active_user
from app.core.database import get_db
from app.core.exceptions import AuthorizationError
from app.models.organization import OrgMembership, OrgRole
from app.models.user import User
from app.schemas.admin import AuditLogResponse
from app.services import audit_service

router = APIRouter(prefix="/org", tags=["Audit"])


@router.get("/audit-logs", response_model=dict)
async def get_audit_logs(
    org_id: uuid.UUID,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=50, ge=1, le=200),
    user_id: uuid.UUID | None = None,
    action: str | None = None,
    resource_type: str | None = None,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(OrgMembership).where(
            OrgMembership.user_id == current_user.id,
            OrgMembership.org_id == org_id,
        )
    )
    membership = result.scalar_one_or_none()
    if not membership or membership.role not in (OrgRole.ADMIN, OrgRole.AUDITOR):
        raise AuthorizationError("Admin or auditor role required")

    logs, total = await audit_service.query_audit_logs(
        db,
        org_id,
        user_id=user_id,
        action=action,
        resource_type=resource_type,
        page=page,
        page_size=page_size,
    )

    return {
        "logs": [AuditLogResponse.model_validate(log) for log in logs],
        "total": total,
        "page": page,
        "page_size": page_size,
    }


@router.get("/reports")
async def compliance_reports(
    org_id: uuid.UUID,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(OrgMembership).where(
            OrgMembership.user_id == current_user.id,
            OrgMembership.org_id == org_id,
        )
    )
    membership = result.scalar_one_or_none()
    if not membership or membership.role not in (OrgRole.ADMIN, OrgRole.AUDITOR):
        raise AuthorizationError("Admin or auditor role required")

    logs, total_logs = await audit_service.query_audit_logs(
        db, org_id, page=1, page_size=1
    )

    return {
        "total_audit_events": total_logs,
        "report_type": "compliance_summary",
        "message": "Detailed compliance reports available via audit log export",
    }
