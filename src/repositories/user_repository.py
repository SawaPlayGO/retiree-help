from sqlalchemy.orm import Session

from src.models.auth import User


class UserRepository:
    """Repository for user data access operations"""

    def __init__(self, session: Session):
        """Initialize repository with a database session

        :param session: SQLAlchemy database session
        """
        self.session = session

    def get_user_by_id(self, user_id: int) -> User | None:
        return self.session.query(User).filter_by(user_id=user_id).first()

    def update_user(self, update_data: dict, user_id: int) -> User | None:
        user = self.session.query(User).filter_by(user_id=user_id).first()
        if not user:
            return None

        for key, value in update_data.items():
            setattr(user, key, value)

        self.session.commit()
        self.session.refresh(user)
        return user
