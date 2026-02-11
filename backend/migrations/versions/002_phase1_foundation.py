"""Phase 1 Foundation - Tags, Notifications, Archive, Expanded Types

Revision ID: 002
Revises: 001
Create Date: 2025-06-01 00:00:00.000000

"""
from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = '002'
down_revision: str | None = '001'
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # --- ALTER secrets ---
    op.add_column('secrets', sa.Column('is_archived', sa.Boolean(), server_default='false', nullable=False))
    op.add_column('secrets', sa.Column('deleted_at', sa.DateTime(timezone=True), nullable=True))
    op.add_column('secrets', sa.Column('access_count', sa.Integer(), server_default='0', nullable=False))
    op.add_column('secrets', sa.Column('last_accessed_at', sa.DateTime(timezone=True), nullable=True))

    # --- ALTER vaults ---
    op.add_column('vaults', sa.Column('description_encrypted', sa.Text(), nullable=True))
    op.add_column('vaults', sa.Column('icon', sa.String(100), server_default='folder-lock', nullable=False))
    op.add_column('vaults', sa.Column('safe_for_travel', sa.Boolean(), server_default='false', nullable=False))

    # --- ALTER users ---
    op.add_column('users', sa.Column('travel_mode_enabled', sa.Boolean(), server_default='false', nullable=False))
    op.add_column('users', sa.Column('avatar_url', sa.String(500), nullable=True))
    op.add_column('users', sa.Column('language_pref', sa.String(10), server_default='en', nullable=False))
    op.add_column('users', sa.Column('email_notifications', sa.Boolean(), server_default='true', nullable=False))

    # --- ALTER secret_shares ---
    op.add_column('secret_shares', sa.Column('share_link_token', sa.String(255), nullable=True))
    op.add_column('secret_shares', sa.Column('max_views', sa.Integer(), nullable=True))
    op.add_column('secret_shares', sa.Column('view_count', sa.Integer(), server_default='0', nullable=False))
    op.add_column('secret_shares', sa.Column('audience', sa.String(50), server_default='specific_user', nullable=False))
    op.create_unique_constraint('uq_secret_shares_share_link_token', 'secret_shares', ['share_link_token'])

    # --- EXPAND secrettype enum ---
    # For PostgreSQL, we need to add new values to the existing enum
    op.execute("ALTER TYPE secrettype ADD VALUE IF NOT EXISTS 'login'")
    op.execute("ALTER TYPE secrettype ADD VALUE IF NOT EXISTS 'credit_card'")
    op.execute("ALTER TYPE secrettype ADD VALUE IF NOT EXISTS 'identity'")
    op.execute("ALTER TYPE secrettype ADD VALUE IF NOT EXISTS 'document'")
    op.execute("ALTER TYPE secrettype ADD VALUE IF NOT EXISTS 'bank_account'")
    op.execute("ALTER TYPE secrettype ADD VALUE IF NOT EXISTS 'crypto_wallet'")
    op.execute("ALTER TYPE secrettype ADD VALUE IF NOT EXISTS 'database'")
    op.execute("ALTER TYPE secrettype ADD VALUE IF NOT EXISTS 'driver_license'")
    op.execute("ALTER TYPE secrettype ADD VALUE IF NOT EXISTS 'email_account'")
    op.execute("ALTER TYPE secrettype ADD VALUE IF NOT EXISTS 'medical_record'")
    op.execute("ALTER TYPE secrettype ADD VALUE IF NOT EXISTS 'membership'")
    op.execute("ALTER TYPE secrettype ADD VALUE IF NOT EXISTS 'outdoor_license'")
    op.execute("ALTER TYPE secrettype ADD VALUE IF NOT EXISTS 'passport'")
    op.execute("ALTER TYPE secrettype ADD VALUE IF NOT EXISTS 'rewards'")
    op.execute("ALTER TYPE secrettype ADD VALUE IF NOT EXISTS 'server'")
    op.execute("ALTER TYPE secrettype ADD VALUE IF NOT EXISTS 'social_security_number'")
    op.execute("ALTER TYPE secrettype ADD VALUE IF NOT EXISTS 'software_license'")
    op.execute("ALTER TYPE secrettype ADD VALUE IF NOT EXISTS 'wireless_router'")

    # --- CREATE tags ---
    op.create_table(
        'tags',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('name', sa.String(100), nullable=False),
        sa.Column('color', sa.String(7), nullable=False, server_default='#6366f1'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.UniqueConstraint('user_id', 'name', name='uq_tags_user_name'),
    )

    # --- CREATE secret_tags ---
    op.create_table(
        'secret_tags',
        sa.Column('secret_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('secrets.id', ondelete='CASCADE'), primary_key=True),
        sa.Column('tag_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('tags.id', ondelete='CASCADE'), primary_key=True),
    )

    # --- CREATE notifications ---
    op.create_table(
        'notifications',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('type', sa.String(50), nullable=False),
        sa.Column('title', sa.String(255), nullable=False),
        sa.Column('message', sa.Text(), nullable=False),
        sa.Column('read', sa.Boolean(), server_default='false', nullable=False),
        sa.Column('metadata_json', postgresql.JSON(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), index=True),
    )


def downgrade() -> None:
    op.drop_table('notifications')
    op.drop_table('secret_tags')
    op.drop_table('tags')

    op.drop_constraint('uq_secret_shares_share_link_token', 'secret_shares', type_='unique')
    op.drop_column('secret_shares', 'audience')
    op.drop_column('secret_shares', 'view_count')
    op.drop_column('secret_shares', 'max_views')
    op.drop_column('secret_shares', 'share_link_token')

    op.drop_column('users', 'email_notifications')
    op.drop_column('users', 'language_pref')
    op.drop_column('users', 'avatar_url')
    op.drop_column('users', 'travel_mode_enabled')

    op.drop_column('vaults', 'safe_for_travel')
    op.drop_column('vaults', 'icon')
    op.drop_column('vaults', 'description_encrypted')

    op.drop_column('secrets', 'last_accessed_at')
    op.drop_column('secrets', 'access_count')
    op.drop_column('secrets', 'deleted_at')
    op.drop_column('secrets', 'is_archived')
