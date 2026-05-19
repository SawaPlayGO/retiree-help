from sqlalchemy import Column, DateTime, Enum, Integer, String, func

from src.backend.database import Base
from src.backend.utils.enums import Role


class User(Base):
    """User model for database"""

    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(255), unique=True, nullable=False, index=True)
    description = Column(String(255), nullable=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    role = Column(Enum(Role), nullable=False)
    created_at = Column(DateTime, server_default=func.now(), nullable=False)
    updated_at = Column(
        DateTime, server_default=func.now(), onupdate=func.now(), nullable=False
    )
    avatar_url = Column(String(255), nullable=True)

    def __repr__(self):
        return f"<User(id={self.id}, username={self.username}, description={self.description}, email={self.email}, role={self.role}, avatar_url={self.avatar_url})>"
