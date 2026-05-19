import json

from sqlalchemy import create_engine, URL
from sqlalchemy.orm import sessionmaker, declarative_base, Session
from typing import Generator
from minio import Minio

from src.backend.config import settings

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
        from src.backend.models.auth import User  # noqa

        Base.metadata.create_all(bind=self.engine)
        print("Database tables created successfully")


class ObjectStorageManager:
    """
    Управление подключением к S3.
    """

    def __init__(self):

        self.endpoint = f"{settings.S3_ENDPOINT}:{settings.S3_PORT}"

        self.client = Minio(
            self.endpoint,
            access_key=settings.S3_ACCESS_KEY,
            secret_key=settings.S3_SECRET_KEY,
            secure=settings.S3_SECURE,
        )

    def get_client(self) -> Minio:
        """
        Получить Minio клиент.
        """

        return self.client

    def init_bucket(self) -> None:
        if not self.client.bucket_exists(settings.S3_BUCKET):
            self.client.make_bucket(settings.S3_BUCKET)
            self.client.set_bucket_policy(settings.S3_BUCKET, json.dumps(ObjectStorageManager.get_policy(settings.S3_BUCKET)))
            print(f"Created S3 bucket: {settings.S3_BUCKET}")

        bucket_name = "order-images"
        if not self.client.bucket_exists(bucket_name):
            self.client.make_bucket(bucket_name)
            self.client.set_bucket_policy(bucket_name, json.dumps(ObjectStorageManager.get_policy(bucket_name)))
            print(f"Created S3 bucket: {bucket_name}")

        else:
            print(f"S3 bucket already exists: {settings.S3_BUCKET}")

    @staticmethod
    def get_policy(bucket_name: str) -> dict:
        return {
            "Version": "2012-10-17",
            "Statement": [
                {
                    "Effect": "Allow",
                    "Principal": {"AWS": ["*"]},
                    "Action": ["s3:GetObject"],
                    "Resource": [f"arn:aws:s3:::{bucket_name}/*"],
                }
            ],
        }


db_manager = DatabaseManager()
s3_manager = ObjectStorageManager()
