"""add needs_revision and cancelled statuses to orderstatus enum

Revision ID: 1684b1cb4cd4
Revises: 4280d9325b50
Create Date: 2026-05-19 21:30:01.283984

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '1684b1cb4cd4'
down_revision: Union[str, Sequence[str], None] = '4280d9325b50'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Add NEEDS_REVISION and CANCELLED values to orderstatus enum
    op.execute("ALTER TYPE orderstatus ADD VALUE 'NEEDS_REVISION' BEFORE 'COMPLETED'")
    op.execute("ALTER TYPE orderstatus ADD VALUE 'CANCELLED' AFTER 'COMPLETED'")


def downgrade() -> None:
    """Downgrade schema."""
    # PostgreSQL doesn't support removing enum values
    pass
