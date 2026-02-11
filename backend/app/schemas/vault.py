import uuid
from datetime import datetime

from pydantic import BaseModel, Field


class VaultCreate(BaseModel):
    name_encrypted: str = Field(description="Encrypted vault name")
    description_encrypted: str | None = None
    icon: str = Field(default="folder-lock", max_length=100)
    type: str = Field(default="personal", pattern="^(personal|team|shared)$")


class VaultUpdate(BaseModel):
    name_encrypted: str | None = None
    description_encrypted: str | None = None
    icon: str | None = None
    safe_for_travel: bool | None = None


class VaultResponse(BaseModel):
    id: uuid.UUID
    owner_id: uuid.UUID
    org_id: uuid.UUID | None
    name_encrypted: str
    description_encrypted: str | None = None
    icon: str = "folder-lock"
    safe_for_travel: bool = False
    type: str
    item_count: int = 0
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class VaultListResponse(BaseModel):
    vaults: list[VaultResponse]
    total: int


class VaultDetailResponse(VaultResponse):
    type_breakdown: dict[str, int] = {}
    folder_count: int = 0
