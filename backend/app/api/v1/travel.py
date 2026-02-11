from fastapi import APIRouter, Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_client_ip, get_current_active_user
from app.core.database import get_db
from app.models.user import User
from app.services import audit_service

router = APIRouter(prefix="/travel", tags=["Travel Mode"])


@router.post("/enable")
async def enable_travel_mode(
    request: Request,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    current_user.travel_mode_enabled = True
    await db.flush()
    await audit_service.create_audit_log(
        db,
        user_id=current_user.id,
        action="travel.enable",
        resource_type="user",
        resource_id=str(current_user.id),
        ip_address=get_client_ip(request),
        user_agent=request.headers.get("user-agent"),
    )
    return {"travel_mode_enabled": True}


@router.post("/disable")
async def disable_travel_mode(
    request: Request,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    current_user.travel_mode_enabled = False
    await db.flush()
    await audit_service.create_audit_log(
        db,
        user_id=current_user.id,
        action="travel.disable",
        resource_type="user",
        resource_id=str(current_user.id),
        ip_address=get_client_ip(request),
        user_agent=request.headers.get("user-agent"),
    )
    return {"travel_mode_enabled": False}


@router.get("/status")
async def get_travel_status(
    current_user: User = Depends(get_current_active_user),
):
    return {"travel_mode_enabled": current_user.travel_mode_enabled}
