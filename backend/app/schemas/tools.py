from pydantic import BaseModel, Field


class PasswordGenerateRequest(BaseModel):
    length: int = Field(default=20, ge=8, le=128)
    include_uppercase: bool = True
    include_lowercase: bool = True
    include_numbers: bool = True
    include_symbols: bool = True
    exclude_ambiguous: bool = False
    custom_symbols: str | None = None


class PasswordGenerateResponse(BaseModel):
    password: str
    strength_score: int
    entropy_bits: float


class BreachCheckRequest(BaseModel):
    password_hash_prefix: str = Field(
        min_length=5,
        max_length=5,
        description="First 5 characters of SHA-1 hash (k-anonymity)",
    )


class BreachCheckResponse(BaseModel):
    found: bool
    count: int = 0


class HealthReportResponse(BaseModel):
    total_passwords: int
    weak_passwords: int
    reused_passwords: int
    old_passwords: int
    breached_passwords: int
    overall_score: int = Field(ge=0, le=100)
