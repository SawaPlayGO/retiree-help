"""rename user_id to id

Revision ID: f96ed547e2b6
Revises: 88292f5f1071
Create Date: 2026-05-15 21:04:04.563144

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "f96ed547e2b6"
down_revision: Union[str, Sequence[str], None] = "88292f5f1071"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade():
    op.alter_column("users", "user_id", new_column_name="id")

    op.drop_index("ix_users_user_id", table_name="users")
    op.create_index("ix_users_id", "users", ["id"], unique=False)


def downgrade():
    op.drop_index("ix_users_id", table_name="users")

    op.alter_column("users", "id", new_column_name="user_id")

    op.create_index("ix_users_user_id", "users", ["user_id"], unique=False)
