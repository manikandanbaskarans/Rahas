import uuid
from datetime import datetime

from pydantic import BaseModel, EmailStr, Field


class OrgCreate(BaseModel):
    name: str = Field(min_length=1, max_length=255)


class OrgResponse(BaseModel):
    id: uuid.UUID
    name: str
    created_at: datetime

    model_config = {"from_attributes": True}


class InviteUserRequest(BaseModel):
    email: EmailStr
    role: str = Field(default="member", pattern="^(admin|manager|member|auditor)$")


class OrgUserResponse(BaseModel):
    user_id: uuid.UUID
    email: str
    name: str
    role: str
    status: str
    joined_at: datetime


class TeamCreate(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    encrypted_team_key: str | None = None


class TeamResponse(BaseModel):
    id: uuid.UUID
    org_id: uuid.UUID
    name: str
    created_at: datetime

    model_config = {"from_attributes": True}


class TeamMemberAdd(BaseModel):
    user_id: uuid.UUID
    encrypted_team_key_for_user: str
    role: str = Field(default="member", pattern="^(admin|member)$")


class PasswordPolicyUpdate(BaseModel):
    min_length: int = Field(default=12, ge=8, le=128)
    require_uppercase: bool = True
    require_numbers: bool = True
    require_symbols: bool = True
    max_age_days: int = Field(default=90, ge=0, le=365)
    rotation_reminder_days: int = Field(default=80, ge=0, le=365)


class PasswordPolicyResponse(BaseModel):
    id: uuid.UUID
    org_id: uuid.UUID
    min_length: int
    require_uppercase: bool
    require_numbers: bool
    require_symbols: bool
    max_age_days: int
    rotation_reminder_days: int

    model_config = {"from_attributes": True}


class AccessPolicyUpdate(BaseModel):
    allowed_ips: str | None = None
    require_mfa: bool = False
    session_timeout_minutes: int = Field(default=15, ge=5, le=1440)
    max_failed_attempts: int = Field(default=5, ge=3, le=20)
    lockout_duration_minutes: int = Field(default=15, ge=5, le=1440)


class AuditLogResponse(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID | None
    action: str
    resource_type: str
    resource_id: str | None
    ip_address: str | None
    user_agent: str | None
    metadata_json: dict | None
    created_at: datetime

    model_config = {"from_attributes": True}


class AuditLogQuery(BaseModel):
    user_id: uuid.UUID | None = None
    action: str | None = None
    resource_type: str | None = None
    start_date: datetime | None = None
    end_date: datetime | None = None
    page: int = Field(default=1, ge=1)
    page_size: int = Field(default=50, ge=1, le=200)
