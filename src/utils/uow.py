from typing import Callable
from src.database import db_manager, s3_manager
from src.repositories.auth_repository import AuthRepository
from src.repositories.bid_repository import BidRepository
from src.repositories.image_repository import ImageRepository
from src.repositories.order_repository import OrderRepository
from src.repositories.user_repository import UserRepository


class UnitOfWork:
    """Concrete implementation of Unit of Work pattern for database transactions"""

    def __init__(self, session_factory: Callable):
        """Initialize the UnitOfWork

        :param:
            session_factory: the callable that creates database sessions

        :returns:
            None
        """
        self.session_factory = session_factory

    def __enter__(self):
        """Enter context and initialize session and all repositories

        :returns:
            self: the UnitOfWork instance with initialized repositories
        """
        self.session = self.session_factory()
        self.auth_repository = AuthRepository(session=self.session)
        self.user_repository = UserRepository(session=self.session)
        self.order_repository = OrderRepository(session=self.session)
        self.bid_repository = BidRepository(session=self.session)
        self.image_repository = ImageRepository(
            session=self.session, object_storage_client=s3_manager.client
        )

    def __exit__(self, exc_type, exc_val, exc_tb):
        """Exit context, commit/rollback transaction, and close session

        :param:
            exc_type: the exception type if an exception occurred
            exc_val: the exception value if an exception occurred
            exc_tb: the exception traceback if an exception occurred

        :returns:
            None
        """
        self.session.close()

    def commit(self):
        """Commit the current database transaction

        :returns:
            None
        """
        self.session.commit()

    def rollback(self):
        """Rollback the current database transaction

        :returns:
            None
        """
        self.session.rollback()


def get_uow():
    """Get the Unit of Work instance as a dependency

    :returns:
        uow: the UnitOfWork instance
    """
    uow = UnitOfWork(session_factory=db_manager.SessionLocal)
    with uow:
        yield uow


def get_uow_factory():
    """Get the Unit of Work instance without opened session as a dependency

    :returns:
        uow: the UnitOfWork instance
    """
    return UnitOfWork(session_factory=db_manager.SessionLocal)
