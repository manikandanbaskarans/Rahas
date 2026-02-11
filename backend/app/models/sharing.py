import enum
import uuid
from datetime import UTC, datetime

from sqlalchemy import DateTime, Enum, ForeignKey, Integer, String, Text, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class SharePermission(str, enum.Enum):
    READ = "read"
    WRITE = "write"


class SecretShare(Base):
    __tablename__ = "secret_shares"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    secret_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("secrets.id", ondelete="CASCADE"), nullable=False
    )
    shared_by: Mapped[uuid.UUID] = mapped_column(Uuid, nullable=False)
    shared_with_user_id: Mapped[uuid.UUID | None] = mapped_column(
        Uuid, ForeignKey("users.id", ondelete="CASCADE"), nullable=True
    )
    shared_with_team_id: Mapped[uuid.UUID | None] = mapped_column(
        Uuid, ForeignKey("teams.id", ondelete="CASCADE"), nullable=True
    )
    encrypted_item_key_for_recipient: Mapped[str] = mapped_column(Text, nullable=False)
    permission: Mapped[SharePermission] = mapped_column(
        Enum(SharePermission), default=SharePermission.READ
    )
    share_link_token: Mapped[str | None] = mapped_column(String(255), unique=True, nullable=True)
    max_views: Mapped[int | None] = mapped_column(Integer, nullable=True)
    view_count: Mapped[int] = mapped_column(Integer, default=0)
    audience: Mapped[str] = mapped_column(String(50), default="specific_user")
    expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC)
    )

    secret: Mapped["Secret"] = relationship(back_populates="shares")  # noqa: F821
    shared_with_user: Mapped["User | None"] = relationship(foreign_keys=[shared_with_user_id])  # noqa: F821
    shared_with_team: Mapped["Team | None"] = relationship(foreign_keys=[shared_with_team_id])  # noqa: F821
