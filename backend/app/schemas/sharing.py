import uuid
from datetime import datetime

from pydantic import BaseModel, Field


class ShareCreate(BaseModel):
    shared_with_user_id: uuid.UUID | None = None
    shared_with_team_id: uuid.UUID | None = None
    encrypted_item_key_for_recipient: str = Field(
        description="Item key encrypted with recipient's public key"
    )
    permission: str = Field(default="read", pattern="^(read|write)$")
    expires_at: datetime | None = None


class ShareUpdate(BaseModel):
    permission: str | None = Field(default=None, pattern="^(read|write)$")
    expires_at: datetime | None = None


class ShareResponse(BaseModel):
    id: uuid.UUID
    secret_id: uuid.UUID
    shared_by: uuid.UUID
    shared_with_user_id: uuid.UUID | None
    shared_with_team_id: uuid.UUID | None
    encrypted_item_key_for_recipient: str
    permission: str
    expires_at: datetime | None
    created_at: datetime

    model_config = {"from_attributes": True}


class SharedSecretResponse(BaseModel):
    share: ShareResponse
    secret_id: uuid.UUID
    secret_type: str
    secret_name_encrypted: str
    secret_data_encrypted: str


class ShareLinkCreate(BaseModel):
    expires_in_hours: int = Field(default=24, ge=1, le=720)
    max_views: int | None = Field(default=None, ge=1)
    encrypted_item_key_for_link: str = Field(
        description="Item key encrypted for link-based access"
    )


class ShareLinkResponse(BaseModel):
    share_id: uuid.UUID
    token: str
    expires_at: datetime
    max_views: int | None
    view_count: int

    model_config = {"from_attributes": True}
