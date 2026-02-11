
from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_active_user
from app.core.database import get_db
from app.models.audit import AuditLog
from app.models.user import User
from app.schemas.vault import VaultResponse
from app.services import vault_service

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


@router.get("/summary")
async def dashboard_summary(
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    # Get vaults with item counts
    vaults, total_vaults = await vault_service.get_user_vaults(db, current_user.id)
    vault_data = []
    total_items = 0

    for v in vaults:
        item_count = await vault_service.get_vault_item_count(db, v.id)
        total_items += item_count
        resp = VaultResponse.model_validate(v)
        resp.item_count = item_count
        vault_data.append(resp.model_dump())

    # Recent activity (last 10 audit logs for this user)
    recent_result = await db.execute(
        select(AuditLog)
        .where(AuditLog.user_id == current_user.id)
        .order_by(AuditLog.created_at.desc())
        .limit(10)
    )
    recent_activity = [
        {
            "action": log.action,
            "resource_type": log.resource_type,
            "created_at": log.created_at.isoformat() if log.created_at else None,
        }
        for log in recent_result.scalars().all()
    ]

    return {
        "vaults": vault_data,
        "total_vaults": total_vaults,
        "total_items": total_items,
        "recent_activity": recent_activity,
    }
