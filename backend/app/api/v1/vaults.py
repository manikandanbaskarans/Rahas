import uuid

from fastapi import APIRouter, Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_client_ip, get_current_active_user
from app.core.database import get_db
from app.models.user import User
from app.schemas.vault import (
    VaultCreate,
    VaultDetailResponse,
    VaultListResponse,
    VaultResponse,
    VaultUpdate,
)
from app.services import audit_service, vault_service

router = APIRouter(prefix="/vaults", tags=["Vaults"])


@router.get("", response_model=VaultListResponse)
async def list_vaults(
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    vaults, total = await vault_service.get_user_vaults(
        db, current_user.id, travel_mode=current_user.travel_mode_enabled,
    )
    vault_responses = []
    for v in vaults:
        item_count = await vault_service.get_vault_item_count(db, v.id)
        resp = VaultResponse.model_validate(v)
        resp.item_count = item_count
        vault_responses.append(resp)
    return VaultListResponse(vaults=vault_responses, total=total)


@router.post("", response_model=VaultResponse, status_code=201)
async def create_vault(
    data: VaultCreate,
    request: Request,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    vault = await vault_service.create_vault(
        db,
        owner_id=current_user.id,
        name_encrypted=data.name_encrypted,
        vault_type=data.type,
        description_encrypted=data.description_encrypted,
        icon=data.icon,
    )
    await audit_service.create_audit_log(
        db,
        user_id=current_user.id,
        action="vault.create",
        resource_type="vault",
        resource_id=str(vault.id),
        ip_address=get_client_ip(request),
        user_agent=request.headers.get("user-agent"),
    )
    return VaultResponse.model_validate(vault)


@router.get("/{vault_id}", response_model=VaultResponse)
async def get_vault(
    vault_id: uuid.UUID,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    vault = await vault_service.get_vault(db, vault_id, current_user.id)
    item_count = await vault_service.get_vault_item_count(db, vault.id)
    resp = VaultResponse.model_validate(vault)
    resp.item_count = item_count
    return resp


@router.get("/{vault_id}/details", response_model=VaultDetailResponse)
async def get_vault_details(
    vault_id: uuid.UUID,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    vault = await vault_service.get_vault(db, vault_id, current_user.id)
    item_count = await vault_service.get_vault_item_count(db, vault.id)
    type_breakdown = await vault_service.get_vault_type_breakdown(db, vault.id)
    folder_count = await vault_service.get_vault_folder_count(db, vault.id)
    resp = VaultDetailResponse.model_validate(vault)
    resp.item_count = item_count
    resp.type_breakdown = type_breakdown
    resp.folder_count = folder_count
    return resp


@router.put("/{vault_id}", response_model=VaultResponse)
async def update_vault(
    vault_id: uuid.UUID,
    data: VaultUpdate,
    request: Request,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    vault = await vault_service.update_vault(
        db, vault_id, current_user.id,
        name_encrypted=data.name_encrypted,
        description_encrypted=data.description_encrypted,
        icon=data.icon,
        safe_for_travel=data.safe_for_travel,
    )
    await audit_service.create_audit_log(
        db,
        user_id=current_user.id,
        action="vault.update",
        resource_type="vault",
        resource_id=str(vault.id),
        ip_address=get_client_ip(request),
        user_agent=request.headers.get("user-agent"),
    )
    return VaultResponse.model_validate(vault)


@router.delete("/{vault_id}", status_code=204)
async def delete_vault(
    vault_id: uuid.UUID,
    request: Request,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    await vault_service.delete_vault(db, vault_id, current_user.id)
    await audit_service.create_audit_log(
        db,
        user_id=current_user.id,
        action="vault.delete",
        resource_type="vault",
        resource_id=str(vault_id),
        ip_address=get_client_ip(request),
        user_agent=request.headers.get("user-agent"),
    )
