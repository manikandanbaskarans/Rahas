import uuid
from datetime import datetime

from pydantic import BaseModel, Field


class ProfileUpdate(BaseModel):
    name: str | None = None
    avatar_url: str | None = None
    language_pref: str | None = Field(default=None, pattern="^[a-z]{2}$")
    email_notifications: bool | None = None


class UserProfileExtended(BaseModel):
    id: uuid.UUID
    email: str
    name: str
    mfa_enabled: bool
    role: str
    status: str
    travel_mode_enabled: bool
    avatar_url: str | None
    language_pref: str
    email_notifications: bool
    kdf_iterations: int
    kdf_memory: int
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class DeviceInfo(BaseModel):
    id: uuid.UUID
    device_info: str | None
    ip_address: str | None
    is_active: bool
    created_at: datetime
    expires_at: datetime

    model_config = {"from_attributes": True}


class AccountDeleteConfirm(BaseModel):
    auth_key: str = Field(description="Current auth key to confirm account deletion")
