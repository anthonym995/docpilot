"""rename_profiles_to_users

Revision ID: 1937dd65a146
Revises: 5fd993fc94e3
Create Date: 2026-11-13 09:03:40.731059

"""
from typing import Sequence, Union

from alembic import op


# revision identifiers, used by Alembic.
revision: str = '1937dd65a146'
down_revision: Union[str, Sequence[str], None] = '5fd993fc94e3'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema: rename profiles table to users."""
    op.rename_table('profiles', 'users')


def downgrade() -> None:
    """Downgrade schema: rename users table back to profiles."""
    op.rename_table('users', 'profiles')
