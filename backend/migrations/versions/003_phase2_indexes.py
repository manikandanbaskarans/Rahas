"""Phase 2 - Add indexes for sorting and filtering

Revision ID: 003
Revises: 002
Create Date: 2025-06-15 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op

revision: str = '003'
down_revision: Union[str, None] = '002'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_index('ix_secrets_access_count', 'secrets', ['access_count'])
    op.create_index('ix_secrets_last_accessed_at', 'secrets', ['last_accessed_at'])
    op.create_index('ix_secrets_is_archived', 'secrets', ['is_archived'])
    op.create_index('ix_secrets_deleted_at', 'secrets', ['deleted_at'])


def downgrade() -> None:
    op.drop_index('ix_secrets_deleted_at', 'secrets')
    op.drop_index('ix_secrets_is_archived', 'secrets')
    op.drop_index('ix_secrets_last_accessed_at', 'secrets')
    op.drop_index('ix_secrets_access_count', 'secrets')
