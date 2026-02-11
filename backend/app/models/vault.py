import enum
import uuid
from datetime import UTC, datetime

from sqlalchemy import Boolean, DateTime, Enum, ForeignKey, String, Text, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class VaultType(str, enum.Enum):
    PERSONAL = "personal"
    TEAM = "team"
    SHARED = "shared"


class Vault(Base):
    __tablename__ = "vaults"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    owner_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    org_id: Mapped[uuid.UUID | None] = mapped_column(
        Uuid, ForeignKey("organizations.id", ondelete="SET NULL"), nullable=True
    )
    name_encrypted: Mapped[str] = mapped_column(Text, nullable=False)
    description_encrypted: Mapped[str | None] = mapped_column(Text, nullable=True)
    icon: Mapped[str] = mapped_column(String(100), default="folder-lock")
    safe_for_travel: Mapped[bool] = mapped_column(Boolean, default=False)
    type: Mapped[VaultType] = mapped_column(Enum(VaultType), default=VaultType.PERSONAL)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC)
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(UTC),
        onupdate=lambda: datetime.now(UTC),
    )

    owner: Mapped["User"] = relationship(back_populates="vaults")  # noqa: F821
    secrets: Mapped[list["Secret"]] = relationship(  # noqa: F821
        back_populates="vault", cascade="all, delete"
    )
    folders: Mapped[list["Folder"]] = relationship(  # noqa: F821
        back_populates="vault", cascade="all, delete"
    )
