import hashlib
import uuid
from datetime import UTC, datetime, timedelta

import pyotp
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.exceptions import (
    AccountLockedError,
    AuthenticationError,
    ConflictError,
)
from app.core.security import (
    create_access_token,
    create_refresh_token,
    hash_auth_key,
    verify_auth_key,
)
from app.models.user import MFAMethod, MFAType, Session, User, UserStatus
from app.schemas.auth import LoginResponse, RegisterRequest, RegisterResponse, UserProfile


async def register_user(db: AsyncSession, data: RegisterRequest) -> RegisterResponse:
    existing = await db.execute(select(User).where(User.email == data.email))
    if existing.scalar_one_or_none():
        raise ConflictError("Email already registered")

    user = User(
        email=data.email,
        name=data.name,
        auth_key_hash=hash_auth_key(data.auth_key),
        encrypted_vault_key=data.encrypted_vault_key,
        encrypted_private_key=data.encrypted_private_key,
        public_key=data.public_key,
        kdf_iterations=data.kdf_iterations,
        kdf_memory=data.kdf_memory,
    )
    db.add(user)
    await db.flush()

    return RegisterResponse(id=user.id, email=user.email, name=user.name)


async def login_user(
    db: AsyncSession,
    email: str,
    auth_key: str,
    ip_address: str | None = None,
    user_agent: str | None = None,
) -> LoginResponse:
    result = await db.execute(select(User).where(User.email == email))
    user = result.scalar_one_or_none()

    if not user:
        raise AuthenticationError()

    if user.status == UserStatus.LOCKED:
        if user.locked_until and user.locked_until > datetime.now(UTC):
            raise AccountLockedError()
        user.status = UserStatus.ACTIVE
        user.failed_login_attempts = 0

    if not verify_auth_key(auth_key, user.auth_key_hash):
        user.failed_login_attempts += 1
        if user.failed_login_attempts >= settings.MAX_FAILED_LOGIN_ATTEMPTS:
            user.status = UserStatus.LOCKED
            user.locked_until = datetime.now(UTC) + timedelta(
                minutes=settings.LOCKOUT_DURATION_MINUTES
            )
        await db.flush()
        raise AuthenticationError()

    user.failed_login_attempts = 0

    if user.mfa_enabled:
        mfa_session = _create_mfa_session_token(user.id)
        return LoginResponse(
            access_token="",
            refresh_token="",
            user=UserProfile.model_validate(user),
            requires_mfa=True,
            mfa_session_token=mfa_session,
        )

    access_token = create_access_token(str(user.id))
    refresh_token = create_refresh_token(str(user.id))

    session = Session(
        user_id=user.id,
        token_hash=hashlib.sha256(refresh_token.encode()).hexdigest(),
        device_info=user_agent,
        ip_address=ip_address,
        expires_at=datetime.now(UTC) + timedelta(days=settings.JWT_REFRESH_TOKEN_EXPIRE_DAYS),
    )
    db.add(session)
    await db.flush()

    return LoginResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        user=UserProfile.model_validate(user),
    )


async def setup_totp(db: AsyncSession, user: User) -> tuple[str, str]:
    secret = pyotp.random_base32()
    totp = pyotp.TOTP(secret)
    provisioning_uri = totp.provisioning_uri(name=user.email, issuer_name=settings.APP_NAME)

    mfa = MFAMethod(
        user_id=user.id,
        type=MFAType.TOTP,
        secret_encrypted=secret,
        verified=False,
    )
    db.add(mfa)
    await db.flush()

    return secret, provisioning_uri


async def verify_totp(db: AsyncSession, user: User, code: str) -> bool:
    result = await db.execute(
        select(MFAMethod).where(
            MFAMethod.user_id == user.id,
            MFAMethod.type == MFAType.TOTP,
        )
    )
    mfa = result.scalar_one_or_none()
    if not mfa or not mfa.secret_encrypted:
        return False

    totp = pyotp.TOTP(mfa.secret_encrypted)
    if totp.verify(code, valid_window=1):
        if not mfa.verified:
            mfa.verified = True
            user.mfa_enabled = True
            await db.flush()
        return True
    return False


async def change_password(
    db: AsyncSession,
    user: User,
    current_auth_key: str,
    new_auth_key: str,
    new_encrypted_vault_key: str,
    new_encrypted_private_key: str,
) -> None:
    if not verify_auth_key(current_auth_key, user.auth_key_hash):
        raise AuthenticationError("Current password is incorrect")

    user.auth_key_hash = hash_auth_key(new_auth_key)
    user.encrypted_vault_key = new_encrypted_vault_key
    user.encrypted_private_key = new_encrypted_private_key
    await db.flush()


async def get_user_devices(
    db: AsyncSession, user_id: uuid.UUID
) -> list[Session]:
    result = await db.execute(
        select(Session)
        .where(Session.user_id == user_id)
        .order_by(Session.created_at.desc())
    )
    return list(result.scalars().all())


async def revoke_session(
    db: AsyncSession, session_id: uuid.UUID, user_id: uuid.UUID
) -> None:
    from app.core.exceptions import AuthorizationError, NotFoundError

    result = await db.execute(select(Session).where(Session.id == session_id))
    session = result.scalar_one_or_none()

    if not session:
        raise NotFoundError("Session")
    if session.user_id != user_id:
        raise AuthorizationError("Not authorized to revoke this session")

    session.is_active = False
    await db.flush()


async def delete_user_account(
    db: AsyncSession, user_id: uuid.UUID
) -> None:
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if user:
        await db.delete(user)
        await db.flush()


def _create_mfa_session_token(user_id: uuid.UUID) -> str:
    from app.core.security import create_access_token

    return create_access_token(str(user_id), extra_claims={"type": "mfa_pending", "mfa": True})
