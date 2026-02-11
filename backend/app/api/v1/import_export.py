import uuid

from fastapi import APIRouter, Depends, Request
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_client_ip, get_current_active_user
from app.core.database import get_db
from app.core.exceptions import ValidationError
from app.models.user import User
from app.services import audit_service, secret_service

router = APIRouter(prefix="/import", tags=["Import/Export"])


class ImportItem(BaseModel):
    type: str = Field(default="password")
    name_encrypted: str
    data_encrypted: str
    encrypted_item_key: str
    metadata_encrypted: str | None = None
    folder_id: uuid.UUID | None = None
    favorite: bool = False


class BulkImportRequest(BaseModel):
    vault_id: uuid.UUID
    items: list[ImportItem] = Field(max_length=500)


class BulkImportResponse(BaseModel):
    imported: int
    failed: int
    errors: list[str]


@router.post("/bulk-create", response_model=BulkImportResponse)
async def bulk_create(
    data: BulkImportRequest,
    request: Request,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    if len(data.items) > 500:
        raise ValidationError("Maximum 500 items per import batch")

    imported = 0
    failed = 0
    errors: list[str] = []

    for i, item in enumerate(data.items):
        try:
            await secret_service.create_secret(
                db,
                data.vault_id,
                current_user.id,
                secret_type=item.type,
                name_encrypted=item.name_encrypted,
                data_encrypted=item.data_encrypted,
                encrypted_item_key=item.encrypted_item_key,
                metadata_encrypted=item.metadata_encrypted,
                folder_id=item.folder_id,
                favorite=item.favorite,
            )
            imported += 1
        except Exception as e:
            failed += 1
            errors.append(f"Item {i}: {str(e)}")

    await audit_service.create_audit_log(
        db,
        user_id=current_user.id,
        action="secret.bulk_import",
        resource_type="vault",
        resource_id=str(data.vault_id),
        ip_address=get_client_ip(request),
        user_agent=request.headers.get("user-agent"),
        metadata={"imported": imported, "failed": failed},
    )

    return BulkImportResponse(imported=imported, failed=failed, errors=errors)
