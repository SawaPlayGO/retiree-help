from typing import Any

import bcrypt
from psycopg2 import IntegrityError
from sqlalchemy.orm import Session

from src.models.auth import User
from src.utils.enums import Role


class AuthRepository:
    """Repository for user data access operations"""

    def __init__(self, session: Session):
        """Initialize repository with a database session

        :param session: SQLAlchemy database session
        """
        self.session = session

    def create_user(self, user_data: dict[str, Any]) -> User | None:
        try:
            user = User(**user_data)

            self.session.add(user)
            self.session.commit()
            self.session.refresh(user)

            return user

        except IntegrityError:
            self.session.rollback()
            raise

    def check_user_exists_by_email(self, email: str) -> bool:
        return self.session.query(User).filter_by(email=email).first() is not None

    def check_password_hash(self, email: str, password: str) -> bool:
        user = self.session.query(User).filter_by(email=email).first()
        if not user:
            return False
        return bcrypt.checkpw(
            password.encode("utf-8"), user.password_hash.encode("utf-8")
        )

    def get_user_role_by_email(self, email: str) -> Role | None:
        user = self.session.query(User).filter_by(email=email).first()
        if not user:
            return None
        return user.role

    def get_user_by_email(self, email: str) -> User | None:
        return self.session.query(User).filter_by(email=email).first()

    def delete_user(self, user_id: int): ...
