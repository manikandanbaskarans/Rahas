import enum
import uuid
from datetime import UTC, datetime

from sqlalchemy import Boolean, DateTime, Enum, ForeignKey, Integer, Text, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class SecretType(str, enum.Enum):
    PASSWORD = "password"
    API_TOKEN = "api_token"
    SECURE_NOTE = "secure_note"
    SSH_KEY = "ssh_key"
    CERTIFICATE = "certificate"
    ENCRYPTION_KEY = "encryption_key"
    LOGIN = "login"
    CREDIT_CARD = "credit_card"
    IDENTITY = "identity"
    DOCUMENT = "document"
    BANK_ACCOUNT = "bank_account"
    CRYPTO_WALLET = "crypto_wallet"
    DATABASE = "database"
    DRIVER_LICENSE = "driver_license"
    EMAIL_ACCOUNT = "email_account"
    MEDICAL_RECORD = "medical_record"
    MEMBERSHIP = "membership"
    OUTDOOR_LICENSE = "outdoor_license"
    PASSPORT = "passport"
    REWARDS = "rewards"
    SERVER = "server"
    SOCIAL_SECURITY_NUMBER = "social_security_number"
    SOFTWARE_LICENSE = "software_license"
    WIRELESS_ROUTER = "wireless_router"


class Secret(Base):
    __tablename__ = "secrets"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    vault_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("vaults.id", ondelete="CASCADE"), nullable=False
    )
    folder_id: Mapped[uuid.UUID | None] = mapped_column(
        Uuid, ForeignKey("folders.id", ondelete="SET NULL"), nullable=True
    )
    type: Mapped[SecretType] = mapped_column(Enum(SecretType), default=SecretType.PASSWORD)
    name_encrypted: Mapped[str] = mapped_column(Text, nullable=False)
    data_encrypted: Mapped[str] = mapped_column(Text, nullable=False)
    encrypted_item_key: Mapped[str] = mapped_column(Text, nullable=False)
    metadata_encrypted: Mapped[str | None] = mapped_column(Text, nullable=True)
    favorite: Mapped[bool] = mapped_column(Boolean, default=False)
    is_deleted: Mapped[bool] = mapped_column(Boolean, default=False)
    is_archived: Mapped[bool] = mapped_column(Boolean, default=False)
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    access_count: Mapped[int] = mapped_column(Integer, default=0)
    last_accessed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC)
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(UTC),
        onupdate=lambda: datetime.now(UTC),
    )

    vault: Mapped["Vault"] = relationship(back_populates="secrets")  # noqa: F821
    folder: Mapped["Folder | None"] = relationship(back_populates="secrets")
    versions: Mapped[list["SecretVersion"]] = relationship(
        back_populates="secret", cascade="all, delete"
    )
    shares: Mapped[list["SecretShare"]] = relationship(  # noqa: F821
        back_populates="secret", cascade="all, delete"
    )
    tags: Mapped[list["Tag"]] = relationship(  # noqa: F821
        secondary="secret_tags", back_populates="secrets"
    )


class Folder(Base):
    __tablename__ = "folders"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    vault_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("vaults.id", ondelete="CASCADE"), nullable=False
    )
    name_encrypted: Mapped[str] = mapped_column(Text, nullable=False)
    parent_folder_id: Mapped[uuid.UUID | None] = mapped_column(
        Uuid, ForeignKey("folders.id", ondelete="CASCADE"), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC)
    )

    vault: Mapped["Vault"] = relationship(back_populates="folders")  # noqa: F821
    secrets: Mapped[list["Secret"]] = relationship(back_populates="folder")
    children: Mapped[list["Folder"]] = relationship(back_populates="parent")
    parent: Mapped["Folder | None"] = relationship(
        back_populates="children", remote_side=[id]
    )


class SecretVersion(Base):
    __tablename__ = "secret_versions"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    secret_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("secrets.id", ondelete="CASCADE"), nullable=False
    )
    data_encrypted: Mapped[str] = mapped_column(Text, nullable=False)
    encrypted_item_key: Mapped[str] = mapped_column(Text, nullable=False)
    version_number: Mapped[int] = mapped_column(Integer, nullable=False)
    created_by: Mapped[uuid.UUID] = mapped_column(Uuid, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC)
    )

    secret: Mapped["Secret"] = relationship(back_populates="versions")
