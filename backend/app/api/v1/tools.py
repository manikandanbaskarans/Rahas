import math
import secrets
import string

import httpx
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_active_user
from app.core.database import get_db
from app.models.user import User
from app.schemas.tools import (
    BreachCheckRequest,
    BreachCheckResponse,
    PasswordGenerateRequest,
    PasswordGenerateResponse,
)
from app.services import checkpost_service

router = APIRouter(prefix="/tools", tags=["Password Tools"])

AMBIGUOUS_CHARS = "Il1O0"


@router.post("/generate-password", response_model=PasswordGenerateResponse)
async def generate_password(data: PasswordGenerateRequest):
    charset = ""
    if data.include_lowercase:
        charset += string.ascii_lowercase
    if data.include_uppercase:
        charset += string.ascii_uppercase
    if data.include_numbers:
        charset += string.digits
    if data.include_symbols:
        charset += data.custom_symbols or "!@#$%^&*()_+-=[]{}|;:,.<>?"

    if data.exclude_ambiguous:
        charset = "".join(c for c in charset if c not in AMBIGUOUS_CHARS)

    if not charset:
        charset = string.ascii_letters + string.digits

    password = "".join(secrets.choice(charset) for _ in range(data.length))

    pool_size = len(set(charset))
    entropy = data.length * math.log2(pool_size) if pool_size > 0 else 0

    strength = 0
    if entropy >= 28:
        strength = 1
    if entropy >= 36:
        strength = 2
    if entropy >= 60:
        strength = 3
    if entropy >= 80:
        strength = 4

    return PasswordGenerateResponse(
        password=password,
        strength_score=strength,
        entropy_bits=round(entropy, 2),
    )


@router.post("/check-breach", response_model=BreachCheckResponse)
async def check_breach(data: BreachCheckRequest):
    prefix = data.password_hash_prefix.upper()

    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"https://api.pwnedpasswords.com/range/{prefix}",
                timeout=10.0,
            )

        if response.status_code != 200:
            return BreachCheckResponse(found=False, count=0)

        lines = response.text.strip().split("\n")
        total = 0
        found = False
        for line in lines:
            parts = line.strip().split(":")
            if len(parts) == 2:
                count = int(parts[1])
                if count > 0:
                    found = True
                    total += count

        return BreachCheckResponse(found=found, count=total)
    except httpx.RequestError:
        return BreachCheckResponse(found=False, count=0)


@router.get("/health-report")
async def health_report(
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    summary = await checkpost_service.get_security_summary(db, current_user.id)
    return {
        **summary,
        "message": (
            "Client should decrypt passwords locally"
            " and compute strength/reuse/breach metrics"
        ),
    }
