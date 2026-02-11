import uuid

from fastapi import APIRouter, Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_client_ip, get_current_active_user
from app.core.database import get_db
from app.models.user import User
from app.schemas.sharing import (
    ShareCreate,
    SharedSecretResponse,
    ShareLinkCreate,
    ShareLinkResponse,
    ShareResponse,
    ShareUpdate,
)
from app.services import audit_service, sharing_service

router = APIRouter(tags=["Sharing"])


@router.post("/secrets/{secret_id}/share", response_model=ShareResponse, status_code=201)
async def share_secret(
    secret_id: uuid.UUID,
    data: ShareCreate,
    request: Request,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    share = await sharing_service.share_secret(
        db,
        secret_id,
        current_user.id,
        shared_with_user_id=data.shared_with_user_id,
        shared_with_team_id=data.shared_with_team_id,
        encrypted_item_key_for_recipient=data.encrypted_item_key_for_recipient,
        permission=data.permission,
        expires_at=data.expires_at,
    )
    await audit_service.create_audit_log(
        db,
        user_id=current_user.id,
        action="secret.share",
        resource_type="share",
        resource_id=str(share.id),
        ip_address=get_client_ip(request),
        user_agent=request.headers.get("user-agent"),
        metadata={
            "secret_id": str(secret_id),
            "shared_with_user": str(data.shared_with_user_id) if data.shared_with_user_id else None,
            "shared_with_team": str(data.shared_with_team_id) if data.shared_with_team_id else None,
        },
    )
    return ShareResponse.model_validate(share)


@router.get("/shared-with-me", response_model=list[SharedSecretResponse])
async def shared_with_me(
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    results = await sharing_service.get_shared_with_me(db, current_user.id)
    return [
        SharedSecretResponse(
            share=ShareResponse.model_validate(share),
            secret_id=secret.id,
            secret_type=secret.type.value,
            secret_name_encrypted=secret.name_encrypted,
            secret_data_encrypted=secret.data_encrypted,
        )
        for share, secret in results
    ]


@router.delete("/shares/{share_id}", status_code=204)
async def revoke_share(
    share_id: uuid.UUID,
    request: Request,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    await sharing_service.revoke_share(db, share_id, current_user.id)
    await audit_service.create_audit_log(
        db,
        user_id=current_user.id,
        action="secret.share_revoke",
        resource_type="share",
        resource_id=str(share_id),
        ip_address=get_client_ip(request),
        user_agent=request.headers.get("user-agent"),
    )


@router.put("/shares/{share_id}", response_model=ShareResponse)
async def update_share(
    share_id: uuid.UUID,
    data: ShareUpdate,
    request: Request,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    share = await sharing_service.update_share(
        db, share_id, current_user.id, permission=data.permission, expires_at=data.expires_at
    )
    await audit_service.create_audit_log(
        db,
        user_id=current_user.id,
        action="secret.share_update",
        resource_type="share",
        resource_id=str(share_id),
        ip_address=get_client_ip(request),
        user_agent=request.headers.get("user-agent"),
    )
    return ShareResponse.model_validate(share)


@router.post("/secrets/{secret_id}/share-link", response_model=ShareLinkResponse, status_code=201)
async def create_share_link(
    secret_id: uuid.UUID,
    data: ShareLinkCreate,
    request: Request,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    share = await sharing_service.create_share_link(
        db,
        secret_id,
        current_user.id,
        encrypted_item_key_for_link=data.encrypted_item_key_for_link,
        expires_in_hours=data.expires_in_hours,
        max_views=data.max_views,
    )
    await audit_service.create_audit_log(
        db,
        user_id=current_user.id,
        action="secret.share_link_create",
        resource_type="share",
        resource_id=str(share.id),
        ip_address=get_client_ip(request),
        user_agent=request.headers.get("user-agent"),
        metadata={"secret_id": str(secret_id)},
    )
    return ShareLinkResponse(
        share_id=share.id,
        token=share.share_link_token,
        expires_at=share.expires_at,
        max_views=share.max_views,
        view_count=share.view_count,
    )


@router.get("/share-links/{token}")
async def access_share_link(
    token: str,
    db: AsyncSession = Depends(get_db),
):
    share, secret = await sharing_service.access_share_link(db, token)
    return {
        "secret_id": str(secret.id),
        "secret_type": secret.type.value,
        "secret_name_encrypted": secret.name_encrypted,
        "secret_data_encrypted": secret.data_encrypted,
        "encrypted_item_key": share.encrypted_item_key_for_recipient,
        "view_count": share.view_count,
        "max_views": share.max_views,
    }
