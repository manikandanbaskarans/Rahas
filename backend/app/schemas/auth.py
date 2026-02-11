import uuid

from pydantic import BaseModel, EmailStr, Field


class RegisterRequest(BaseModel):
    email: EmailStr
    name: str = Field(min_length=1, max_length=255)
    auth_key: str = Field(min_length=32, description="Derived auth key from Argon2id")
    encrypted_vault_key: str = Field(description="Vault key encrypted with master key")
    encrypted_private_key: str = Field(description="RSA private key encrypted with master key")
    public_key: str = Field(description="RSA public key (plaintext)")
    kdf_iterations: int = Field(default=3, ge=1, le=10)
    kdf_memory: int = Field(default=65536, ge=16384, le=1048576)


class RegisterResponse(BaseModel):
    id: uuid.UUID
    email: str
    name: str
    message: str = "Registration successful"


class LoginRequest(BaseModel):
    email: EmailStr
    auth_key: str = Field(min_length=32, description="Derived auth key from Argon2id")


class LoginResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: "UserProfile"
    requires_mfa: bool = False
    mfa_session_token: str | None = None


class MFAVerifyRequest(BaseModel):
    mfa_session_token: str
    code: str = Field(min_length=6, max_length=6)


class MFASetupRequest(BaseModel):
    type: str = Field(pattern="^(totp|email)$")


class MFASetupResponse(BaseModel):
    secret: str | None = None
    qr_uri: str | None = None
    message: str


class RefreshTokenRequest(BaseModel):
    refresh_token: str


class PasswordChangeRequest(BaseModel):
    current_auth_key: str
    new_auth_key: str = Field(min_length=32)
    new_encrypted_vault_key: str
    new_encrypted_private_key: str


class UserProfile(BaseModel):
    id: uuid.UUID
    email: str
    name: str
    encrypted_vault_key: str
    encrypted_private_key: str | None
    public_key: str | None
    kdf_iterations: int
    kdf_memory: int
    mfa_enabled: bool
    role: str
    status: str

    model_config = {"from_attributes": True}


LoginResponse.model_rebuild()
