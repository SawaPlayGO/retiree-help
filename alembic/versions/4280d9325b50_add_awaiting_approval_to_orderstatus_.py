"""add awaiting_approval to orderstatus enum

Revision ID: 4280d9325b50
Revises: bfcb31f63ad0
Create Date: 2026-05-19 21:08:02.869656

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '4280d9325b50'
down_revision: Union[str, Sequence[str], None] = 'bfcb31f63ad0'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Add AWAITING_APPROVAL value to orderstatus enum
    op.execute("ALTER TYPE orderstatus ADD VALUE 'AWAITING_APPROVAL' BEFORE 'COMPLETED'")


def downgrade() -> None:
    """Downgrade schema."""
    # PostgreSQL doesn't support removing enum values
    pass
