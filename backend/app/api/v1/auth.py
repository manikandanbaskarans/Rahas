import hashlib
from datetime import UTC, datetime, timedelta

from fastapi import APIRouter, Depends, Request
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_client_ip, get_current_active_user
from app.core.config import settings
from app.core.database import get_db
from app.core.exceptions import AuthenticationError
from app.core.security import create_access_token, create_refresh_token, decode_token
from app.models.user import Session, User
from app.schemas.auth import (
    LoginRequest,
    LoginResponse,
    MFASetupRequest,
    MFASetupResponse,
    MFAVerifyRequest,
    PasswordChangeRequest,
    RefreshTokenRequest,
    RegisterRequest,
    RegisterResponse,
    UserProfile,
)
from app.services import audit_service, auth_service

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/register", response_model=RegisterResponse, status_code=201)
async def register(
    data: RegisterRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    result = await auth_service.register_user(db, data)
    await audit_service.create_audit_log(
        db,
        user_id=result.id,
        action="user.register",
        resource_type="user",
        resource_id=str(result.id),
        ip_address=get_client_ip(request),
        user_agent=request.headers.get("user-agent"),
    )
    return result


@router.post("/login", response_model=LoginResponse)
async def login(
    data: LoginRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    result = await auth_service.login_user(
        db,
        data.email,
        data.auth_key,
        ip_address=get_client_ip(request),
        user_agent=request.headers.get("user-agent"),
    )
    if not result.requires_mfa:
        await audit_service.create_audit_log(
            db,
            user_id=result.user.id,
            action="user.login",
            resource_type="session",
            ip_address=get_client_ip(request),
            user_agent=request.headers.get("user-agent"),
        )
    return result


@router.post("/refresh", response_model=dict)
async def refresh_token(
    data: RefreshTokenRequest,
    db: AsyncSession = Depends(get_db),
):
    payload = decode_token(data.refresh_token)
    if not payload or payload.get("type") != "refresh":
        raise AuthenticationError("Invalid refresh token")

    token_hash = hashlib.sha256(data.refresh_token.encode()).hexdigest()
    result = await db.execute(
        select(Session).where(Session.token_hash == token_hash, Session.is_active == True)  # noqa: E712
    )
    session = result.scalar_one_or_none()
    if not session:
        raise AuthenticationError("Session not found or expired")

    if session.expires_at < datetime.now(UTC):
        session.is_active = False
        await db.flush()
        raise AuthenticationError("Session expired")

    new_access = create_access_token(payload["sub"])
    new_refresh = create_refresh_token(payload["sub"])

    session.token_hash = hashlib.sha256(new_refresh.encode()).hexdigest()
    session.expires_at = datetime.now(UTC) + timedelta(days=settings.JWT_REFRESH_TOKEN_EXPIRE_DAYS)
    await db.flush()

    return {
        "access_token": new_access,
        "refresh_token": new_refresh,
        "token_type": "bearer",
    }


@router.post("/logout")
async def logout(
    request: Request,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Session).where(Session.user_id == current_user.id, Session.is_active == True)  # noqa: E712
    )
    sessions = result.scalars().all()
    for session in sessions:
        session.is_active = False
    await db.flush()

    await audit_service.create_audit_log(
        db,
        user_id=current_user.id,
        action="user.logout",
        resource_type="session",
        ip_address=get_client_ip(request),
        user_agent=request.headers.get("user-agent"),
    )
    return {"message": "Logged out successfully"}


@router.post("/mfa/setup", response_model=MFASetupResponse)
async def mfa_setup(
    data: MFASetupRequest,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    if data.type == "totp":
        secret, uri = await auth_service.setup_totp(db, current_user)
        return MFASetupResponse(
            secret=secret,
            qr_uri=uri,
            message="Scan QR code with authenticator app, then verify with a code",
        )
    return MFASetupResponse(message="Unsupported MFA type")


@router.post("/mfa/verify")
async def mfa_verify(
    data: MFAVerifyRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    payload = decode_token(data.mfa_session_token)
    if not payload or not payload.get("mfa"):
        raise AuthenticationError("Invalid MFA session")

    user_id = payload.get("sub")
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise AuthenticationError("User not found")

    if not await auth_service.verify_totp(db, user, data.code):
        raise AuthenticationError("Invalid MFA code")

    access_token = create_access_token(str(user.id))
    refresh_token = create_refresh_token(str(user.id))

    session = Session(
        user_id=user.id,
        token_hash=hashlib.sha256(refresh_token.encode()).hexdigest(),
        device_info=request.headers.get("user-agent"),
        ip_address=get_client_ip(request),
        expires_at=datetime.now(UTC) + timedelta(days=settings.JWT_REFRESH_TOKEN_EXPIRE_DAYS),
    )
    db.add(session)

    await audit_service.create_audit_log(
        db,
        user_id=user.id,
        action="user.mfa_verify",
        resource_type="session",
        ip_address=get_client_ip(request),
        user_agent=request.headers.get("user-agent"),
    )
    await db.flush()

    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "user": UserProfile.model_validate(user),
    }


@router.post("/password/change")
async def change_password(
    data: PasswordChangeRequest,
    request: Request,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    await auth_service.change_password(
        db,
        current_user,
        data.current_auth_key,
        data.new_auth_key,
        data.new_encrypted_vault_key,
        data.new_encrypted_private_key,
    )
    await audit_service.create_audit_log(
        db,
        user_id=current_user.id,
        action="user.password_change",
        resource_type="user",
        resource_id=str(current_user.id),
        ip_address=get_client_ip(request),
        user_agent=request.headers.get("user-agent"),
    )
    return {"message": "Password changed successfully"}
