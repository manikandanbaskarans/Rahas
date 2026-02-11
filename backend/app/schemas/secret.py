import uuid
from datetime import datetime

from pydantic import BaseModel, Field

ALL_SECRET_TYPES = (
    "password|api_token|secure_note|ssh_key|certificate|encryption_key"
    "|login|credit_card|identity|document|bank_account|crypto_wallet"
    "|database|driver_license|email_account|medical_record|membership"
    "|outdoor_license|passport|rewards|server|social_security_number"
    "|software_license|wireless_router"
)


class SecretCreate(BaseModel):
    type: str = Field(
        default="password",
        pattern=f"^({ALL_SECRET_TYPES})$",
    )
    name_encrypted: str
    data_encrypted: str
    encrypted_item_key: str
    metadata_encrypted: str | None = None
    folder_id: uuid.UUID | None = None
    favorite: bool = False


class SecretUpdate(BaseModel):
    name_encrypted: str | None = None
    data_encrypted: str | None = None
    encrypted_item_key: str | None = None
    metadata_encrypted: str | None = None
    folder_id: uuid.UUID | None = None
    favorite: bool | None = None


class SecretResponse(BaseModel):
    id: uuid.UUID
    vault_id: uuid.UUID
    folder_id: uuid.UUID | None
    type: str
    name_encrypted: str
    data_encrypted: str
    encrypted_item_key: str
    metadata_encrypted: str | None
    favorite: bool
    is_archived: bool = False
    deleted_at: datetime | None = None
    access_count: int = 0
    last_accessed_at: datetime | None = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class SecretListResponse(BaseModel):
    secrets: list[SecretResponse]
    total: int


class SecretVersionResponse(BaseModel):
    id: uuid.UUID
    secret_id: uuid.UUID
    data_encrypted: str
    encrypted_item_key: str
    version_number: int
    created_by: uuid.UUID
    created_at: datetime

    model_config = {"from_attributes": True}


class FolderCreate(BaseModel):
    name_encrypted: str
    parent_folder_id: uuid.UUID | None = None


class FolderResponse(BaseModel):
    id: uuid.UUID
    vault_id: uuid.UUID
    name_encrypted: str
    parent_folder_id: uuid.UUID | None
    created_at: datetime

    model_config = {"from_attributes": True}


class SecretMove(BaseModel):
    target_vault_id: uuid.UUID
    encrypted_item_key: str  # Re-encrypted with target vault key


class SecretDuplicate(BaseModel):
    target_vault_id: uuid.UUID | None = None  # None = same vault
    name_encrypted: str
    encrypted_item_key: str
