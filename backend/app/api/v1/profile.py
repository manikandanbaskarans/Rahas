import uuid

from fastapi import APIRouter, Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_client_ip, get_current_active_user
from app.core.database import get_db
from app.core.exceptions import AuthenticationError
from app.core.security import verify_auth_key
from app.models.user import User
from app.schemas.profile import (
    AccountDeleteConfirm,
    DeviceInfo,
    ProfileUpdate,
    UserProfileExtended,
)
from app.services import audit_service, auth_service

router = APIRouter(prefix="/profile", tags=["Profile"])


@router.get("/me", response_model=UserProfileExtended)
async def get_profile(
    current_user: User = Depends(get_current_active_user),
):
    return UserProfileExtended.model_validate(current_user)


@router.put("/me", response_model=UserProfileExtended)
async def update_profile(
    data: ProfileUpdate,
    request: Request,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    if data.name is not None:
        current_user.name = data.name
    if data.avatar_url is not None:
        current_user.avatar_url = data.avatar_url
    if data.language_pref is not None:
        current_user.language_pref = data.language_pref
    if data.email_notifications is not None:
        current_user.email_notifications = data.email_notifications

    await db.flush()

    await audit_service.create_audit_log(
        db,
        user_id=current_user.id,
        action="profile.update",
        resource_type="user",
        resource_id=str(current_user.id),
        ip_address=get_client_ip(request),
        user_agent=request.headers.get("user-agent"),
    )

    return UserProfileExtended.model_validate(current_user)


@router.get("/devices", response_model=list[DeviceInfo])
async def get_devices(
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    sessions = await auth_service.get_user_devices(db, current_user.id)
    return [DeviceInfo.model_validate(s) for s in sessions]


@router.delete("/devices/{device_id}", status_code=204)
async def revoke_device(
    device_id: uuid.UUID,
    request: Request,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    await auth_service.revoke_session(db, device_id, current_user.id)
    await audit_service.create_audit_log(
        db,
        user_id=current_user.id,
        action="session.revoke",
        resource_type="session",
        resource_id=str(device_id),
        ip_address=get_client_ip(request),
        user_agent=request.headers.get("user-agent"),
    )


@router.delete("/account", status_code=204)
async def delete_account(
    data: AccountDeleteConfirm,
    request: Request,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    if not verify_auth_key(data.auth_key, current_user.auth_key_hash):
        raise AuthenticationError("Invalid password")

    await audit_service.create_audit_log(
        db,
        user_id=current_user.id,
        action="account.delete",
        resource_type="user",
        resource_id=str(current_user.id),
        ip_address=get_client_ip(request),
        user_agent=request.headers.get("user-agent"),
    )

    await auth_service.delete_user_account(db, current_user.id)
