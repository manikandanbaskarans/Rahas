"""Initial schema

Revision ID: 001
Revises: None
Create Date: 2025-01-01 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = '001'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Users
    op.create_table(
        'users',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('email', sa.String(320), nullable=False, unique=True, index=True),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('auth_key_hash', sa.String(255), nullable=False),
        sa.Column('encrypted_private_key', sa.Text, nullable=True),
        sa.Column('public_key', sa.Text, nullable=True),
        sa.Column('encrypted_vault_key', sa.Text, nullable=False),
        sa.Column('kdf_iterations', sa.Integer, default=3),
        sa.Column('kdf_memory', sa.Integer, default=65536),
        sa.Column('mfa_enabled', sa.Boolean, default=False),
        sa.Column('role', sa.Enum('owner', 'admin', 'member', name='userrole'), default='member'),
        sa.Column('status', sa.Enum('active', 'inactive', 'locked', 'pending', name='userstatus'), default='active'),
        sa.Column('failed_login_attempts', sa.Integer, default=0),
        sa.Column('locked_until', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
    )

    # Organizations
    op.create_table(
        'organizations',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('settings_json', postgresql.JSON, nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
    )

    # Sessions
    op.create_table(
        'sessions',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('token_hash', sa.String(255), nullable=False, unique=True),
        sa.Column('device_info', sa.String(500), nullable=True),
        sa.Column('ip_address', sa.String(45), nullable=True),
        sa.Column('is_active', sa.Boolean, default=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('expires_at', sa.DateTime(timezone=True), nullable=False),
    )

    # MFA Methods
    op.create_table(
        'mfa_methods',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('type', sa.Enum('totp', 'webauthn', 'email', name='mfatype'), nullable=False),
        sa.Column('secret_encrypted', sa.Text, nullable=True),
        sa.Column('verified', sa.Boolean, default=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    )

    # Org Memberships
    op.create_table(
        'org_memberships',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('org_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('organizations.id', ondelete='CASCADE'), nullable=False),
        sa.Column('role', sa.Enum('admin', 'manager', 'member', 'auditor', name='orgrole'), default='member'),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    )

    # Teams
    op.create_table(
        'teams',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('org_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('organizations.id', ondelete='CASCADE'), nullable=False),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('encrypted_team_key', sa.Text, nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    )

    # Team Memberships
    op.create_table(
        'team_memberships',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('team_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('teams.id', ondelete='CASCADE'), nullable=False),
        sa.Column('encrypted_team_key_for_user', sa.Text, nullable=True),
        sa.Column('role', sa.Enum('admin', 'member', name='teamrole'), default='member'),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    )

    # Vaults
    op.create_table(
        'vaults',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('owner_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('org_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('organizations.id', ondelete='SET NULL'), nullable=True),
        sa.Column('name_encrypted', sa.Text, nullable=False),
        sa.Column('type', sa.Enum('personal', 'team', 'shared', name='vaulttype'), default='personal'),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
    )

    # Folders
    op.create_table(
        'folders',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('vault_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('vaults.id', ondelete='CASCADE'), nullable=False),
        sa.Column('name_encrypted', sa.Text, nullable=False),
        sa.Column('parent_folder_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('folders.id', ondelete='CASCADE'), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    )

    # Secrets
    op.create_table(
        'secrets',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('vault_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('vaults.id', ondelete='CASCADE'), nullable=False),
        sa.Column('folder_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('folders.id', ondelete='SET NULL'), nullable=True),
        sa.Column('type', sa.Enum('password', 'api_token', 'secure_note', 'ssh_key', 'certificate', 'encryption_key', name='secrettype'), default='password'),
        sa.Column('name_encrypted', sa.Text, nullable=False),
        sa.Column('data_encrypted', sa.Text, nullable=False),
        sa.Column('encrypted_item_key', sa.Text, nullable=False),
        sa.Column('metadata_encrypted', sa.Text, nullable=True),
        sa.Column('favorite', sa.Boolean, default=False),
        sa.Column('is_deleted', sa.Boolean, default=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
    )

    # Secret Versions
    op.create_table(
        'secret_versions',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('secret_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('secrets.id', ondelete='CASCADE'), nullable=False),
        sa.Column('data_encrypted', sa.Text, nullable=False),
        sa.Column('encrypted_item_key', sa.Text, nullable=False),
        sa.Column('version_number', sa.Integer, nullable=False),
        sa.Column('created_by', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    )

    # Secret Shares
    op.create_table(
        'secret_shares',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('secret_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('secrets.id', ondelete='CASCADE'), nullable=False),
        sa.Column('shared_by', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('shared_with_user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=True),
        sa.Column('shared_with_team_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('teams.id', ondelete='CASCADE'), nullable=True),
        sa.Column('encrypted_item_key_for_recipient', sa.Text, nullable=False),
        sa.Column('permission', sa.Enum('read', 'write', name='sharepermission'), default='read'),
        sa.Column('expires_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    )

    # Audit Logs (append-only)
    op.create_table(
        'audit_logs',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('org_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('organizations.id', ondelete='SET NULL'), nullable=True),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True),
        sa.Column('action', sa.String(100), nullable=False, index=True),
        sa.Column('resource_type', sa.String(50), nullable=False),
        sa.Column('resource_id', sa.String(255), nullable=True),
        sa.Column('ip_address', sa.String(45), nullable=True),
        sa.Column('user_agent', sa.String(500), nullable=True),
        sa.Column('metadata_json', postgresql.JSON, nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, index=True),
    )

    # Password Policies
    op.create_table(
        'password_policies',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('org_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('organizations.id', ondelete='CASCADE'), nullable=False, unique=True),
        sa.Column('min_length', sa.Integer, default=12),
        sa.Column('require_uppercase', sa.Boolean, default=True),
        sa.Column('require_numbers', sa.Boolean, default=True),
        sa.Column('require_symbols', sa.Boolean, default=True),
        sa.Column('max_age_days', sa.Integer, default=90),
        sa.Column('rotation_reminder_days', sa.Integer, default=80),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    )

    # Access Policies
    op.create_table(
        'access_policies',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('org_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('organizations.id', ondelete='CASCADE'), nullable=False, unique=True),
        sa.Column('allowed_ips', sa.Text, nullable=True),
        sa.Column('require_mfa', sa.Boolean, default=False),
        sa.Column('session_timeout_minutes', sa.Integer, default=15),
        sa.Column('max_failed_attempts', sa.Integer, default=5),
        sa.Column('lockout_duration_minutes', sa.Integer, default=15),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    )


def downgrade() -> None:
    op.drop_table('access_policies')
    op.drop_table('password_policies')
    op.drop_table('audit_logs')
    op.drop_table('secret_shares')
    op.drop_table('secret_versions')
    op.drop_table('secrets')
    op.drop_table('folders')
    op.drop_table('vaults')
    op.drop_table('team_memberships')
    op.drop_table('teams')
    op.drop_table('org_memberships')
    op.drop_table('mfa_methods')
    op.drop_table('sessions')
    op.drop_table('organizations')
    op.drop_table('users')

    for enum_name in ['userrole', 'userstatus', 'mfatype', 'orgrole', 'teamrole',
                      'vaulttype', 'secrettype', 'sharepermission']:
        op.execute(f"DROP TYPE IF EXISTS {enum_name}")
