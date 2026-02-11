import uuid

from fastapi import APIRouter, Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_client_ip, get_current_active_user
from app.core.database import get_db
from app.models.user import User
from app.schemas.secret import (
    FolderCreate,
    FolderResponse,
    SecretCreate,
    SecretDuplicate,
    SecretListResponse,
    SecretMove,
    SecretResponse,
    SecretUpdate,
    SecretVersionResponse,
)
from app.schemas.sharing import ShareResponse
from app.services import audit_service, secret_service, sharing_service

router = APIRouter(tags=["Secrets"])


@router.get("/vaults/{vault_id}/secrets", response_model=SecretListResponse)
async def list_secrets(
    vault_id: uuid.UUID,
    folder_id: uuid.UUID | None = None,
    sort_by: str = "updated_at",
    sort_order: str = "desc",
    category: str | None = None,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    secrets, total = await secret_service.get_vault_secrets(
        db, vault_id, current_user.id, folder_id,
        sort_by=sort_by, sort_order=sort_order, category=category,
    )
    return SecretListResponse(
        secrets=[SecretResponse.model_validate(s) for s in secrets],
        total=total,
    )


@router.post("/vaults/{vault_id}/secrets", response_model=SecretResponse, status_code=201)
async def create_secret(
    vault_id: uuid.UUID,
    data: SecretCreate,
    request: Request,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    secret = await secret_service.create_secret(
        db,
        vault_id,
        current_user.id,
        secret_type=data.type,
        name_encrypted=data.name_encrypted,
        data_encrypted=data.data_encrypted,
        encrypted_item_key=data.encrypted_item_key,
        metadata_encrypted=data.metadata_encrypted,
        folder_id=data.folder_id,
        favorite=data.favorite,
    )
    await audit_service.create_audit_log(
        db,
        user_id=current_user.id,
        action="secret.create",
        resource_type="secret",
        resource_id=str(secret.id),
        ip_address=get_client_ip(request),
        user_agent=request.headers.get("user-agent"),
    )
    return SecretResponse.model_validate(secret)


@router.get("/secrets/archived", response_model=list[SecretResponse])
async def list_archived(
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    secrets = await secret_service.get_archived_secrets(db, current_user.id)
    return [SecretResponse.model_validate(s) for s in secrets]


@router.get("/secrets/deleted", response_model=list[SecretResponse])
async def list_deleted(
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    secrets = await secret_service.get_deleted_secrets(db, current_user.id)
    return [SecretResponse.model_validate(s) for s in secrets]


@router.get("/secrets/{secret_id}", response_model=SecretResponse)
async def get_secret(
    secret_id: uuid.UUID,
    request: Request,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    secret = await secret_service.get_secret(db, secret_id, current_user.id)
    await audit_service.create_audit_log(
        db,
        user_id=current_user.id,
        action="secret.access",
        resource_type="secret",
        resource_id=str(secret_id),
        ip_address=get_client_ip(request),
        user_agent=request.headers.get("user-agent"),
    )
    return SecretResponse.model_validate(secret)


@router.put("/secrets/{secret_id}", response_model=SecretResponse)
async def update_secret(
    secret_id: uuid.UUID,
    data: SecretUpdate,
    request: Request,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    update_data = data.model_dump(exclude_none=True)
    secret = await secret_service.update_secret(
        db, secret_id, current_user.id, **update_data
    )
    await audit_service.create_audit_log(
        db,
        user_id=current_user.id,
        action="secret.update",
        resource_type="secret",
        resource_id=str(secret_id),
        ip_address=get_client_ip(request),
        user_agent=request.headers.get("user-agent"),
    )
    return SecretResponse.model_validate(secret)


@router.delete("/secrets/{secret_id}", status_code=204)
async def delete_secret(
    secret_id: uuid.UUID,
    request: Request,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    await secret_service.delete_secret(db, secret_id, current_user.id)
    await audit_service.create_audit_log(
        db,
        user_id=current_user.id,
        action="secret.delete",
        resource_type="secret",
        resource_id=str(secret_id),
        ip_address=get_client_ip(request),
        user_agent=request.headers.get("user-agent"),
    )


@router.post("/secrets/{secret_id}/archive", response_model=SecretResponse)
async def archive_secret(
    secret_id: uuid.UUID,
    request: Request,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    secret = await secret_service.archive_secret(db, secret_id, current_user.id)
    await audit_service.create_audit_log(
        db,
        user_id=current_user.id,
        action="secret.archive",
        resource_type="secret",
        resource_id=str(secret_id),
        ip_address=get_client_ip(request),
        user_agent=request.headers.get("user-agent"),
    )
    return SecretResponse.model_validate(secret)


@router.post("/secrets/{secret_id}/unarchive", response_model=SecretResponse)
async def unarchive_secret(
    secret_id: uuid.UUID,
    request: Request,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    secret = await secret_service.unarchive_secret(db, secret_id, current_user.id)
    await audit_service.create_audit_log(
        db,
        user_id=current_user.id,
        action="secret.unarchive",
        resource_type="secret",
        resource_id=str(secret_id),
        ip_address=get_client_ip(request),
        user_agent=request.headers.get("user-agent"),
    )
    return SecretResponse.model_validate(secret)


@router.post("/secrets/{secret_id}/restore", response_model=SecretResponse)
async def restore_secret(
    secret_id: uuid.UUID,
    request: Request,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    secret = await secret_service.restore_secret(db, secret_id, current_user.id)
    await audit_service.create_audit_log(
        db,
        user_id=current_user.id,
        action="secret.restore",
        resource_type="secret",
        resource_id=str(secret_id),
        ip_address=get_client_ip(request),
        user_agent=request.headers.get("user-agent"),
    )
    return SecretResponse.model_validate(secret)


@router.delete("/secrets/{secret_id}/permanent", status_code=204)
async def permanent_delete(
    secret_id: uuid.UUID,
    request: Request,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    await secret_service.permanent_delete_secret(db, secret_id, current_user.id)
    await audit_service.create_audit_log(
        db,
        user_id=current_user.id,
        action="secret.permanent_delete",
        resource_type="secret",
        resource_id=str(secret_id),
        ip_address=get_client_ip(request),
        user_agent=request.headers.get("user-agent"),
    )


@router.post("/secrets/{secret_id}/move", response_model=SecretResponse)
async def move_secret(
    secret_id: uuid.UUID,
    data: SecretMove,
    request: Request,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    secret = await secret_service.move_secret(
        db, secret_id, current_user.id,
        target_vault_id=data.target_vault_id,
        encrypted_item_key=data.encrypted_item_key,
    )
    await audit_service.create_audit_log(
        db,
        user_id=current_user.id,
        action="secret.move",
        resource_type="secret",
        resource_id=str(secret_id),
        ip_address=get_client_ip(request),
        user_agent=request.headers.get("user-agent"),
        metadata={"target_vault_id": str(data.target_vault_id)},
    )
    return SecretResponse.model_validate(secret)


@router.post("/secrets/{secret_id}/duplicate", response_model=SecretResponse, status_code=201)
async def duplicate_secret(
    secret_id: uuid.UUID,
    data: SecretDuplicate,
    request: Request,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    secret = await secret_service.duplicate_secret(
        db, secret_id, current_user.id,
        name_encrypted=data.name_encrypted,
        encrypted_item_key=data.encrypted_item_key,
        target_vault_id=data.target_vault_id,
    )
    await audit_service.create_audit_log(
        db,
        user_id=current_user.id,
        action="secret.duplicate",
        resource_type="secret",
        resource_id=str(secret.id),
        ip_address=get_client_ip(request),
        user_agent=request.headers.get("user-agent"),
        metadata={"source_id": str(secret_id)},
    )
    return SecretResponse.model_validate(secret)


@router.get("/secrets/{secret_id}/sharing-history", response_model=list[ShareResponse])
async def get_sharing_history(
    secret_id: uuid.UUID,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    shares = await sharing_service.get_sharing_history(db, secret_id, current_user.id)
    return [ShareResponse.model_validate(s) for s in shares]


@router.get("/secrets/{secret_id}/versions", response_model=list[SecretVersionResponse])
async def get_versions(
    secret_id: uuid.UUID,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    versions = await secret_service.get_secret_versions(db, secret_id, current_user.id)
    return [SecretVersionResponse.model_validate(v) for v in versions]


@router.post("/vaults/{vault_id}/folders", response_model=FolderResponse, status_code=201)
async def create_folder(
    vault_id: uuid.UUID,
    data: FolderCreate,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    folder = await secret_service.create_folder(
        db, vault_id, current_user.id, data.name_encrypted, data.parent_folder_id
    )
    return FolderResponse.model_validate(folder)


@router.get("/vaults/{vault_id}/folders", response_model=list[FolderResponse])
async def list_folders(
    vault_id: uuid.UUID,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    folders = await secret_service.get_vault_folders(db, vault_id, current_user.id)
    return [FolderResponse.model_validate(f) for f in folders]
