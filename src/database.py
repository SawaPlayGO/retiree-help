from sqlalchemy import create_engine, URL
from sqlalchemy.orm import sessionmaker, declarative_base, Session
from typing import Generator

from src.config import settings

# Declare Base separately to be used in Alembic
Base = declarative_base()


class DatabaseManager:
    """Управление подключением к базе данных"""

    def __init__(self):
        # Create URL object with proper encoding
        url = URL.create(
            drivername="postgresql",
            username=settings.POSTGRES_USER,
            password=settings.POSTGRES_PASSWORD,
            host=settings.POSTGRES_HOST,
            port=settings.POSTGRES_PORT,
            database=settings.POSTGRES_DB,
        )

        print(f"DB Connecting to database: {url.render_as_string(hide_password=True)}")

        self.engine = create_engine(
            url,
            echo=False,
            pool_pre_ping=True,
        )

        self.SessionLocal = sessionmaker(
            autocommit=False,
            autoflush=False,
            bind=self.engine,
            expire_on_commit=False,
        )

    def get_db(self) -> Generator[Session, None, None]:
        """
        Dependency для FastAPI

        Yields:
            Session: SQLAlchemy session
        """
        db = self.SessionLocal()
        try:
            yield db
        finally:
            db.close()

    def init_db(self) -> None:
        """
        Создаёт все таблицы в БД
        """
        # важно: импорт моделей
        from src.models.auth import User  # noqa

        Base.metadata.create_all(bind=self.engine)
        print("Database tables created successfully")


db_manager = DatabaseManager()
