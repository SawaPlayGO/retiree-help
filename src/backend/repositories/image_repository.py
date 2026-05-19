from typing import BinaryIO
import uuid
from minio import Minio
from sqlalchemy.orm import Session
from src.backend.config import settings
from src.backend.models.auth import User
from src.backend.models.order import ImagesOrder


class ImageRepository:
    """Repository for image data access operations"""

    def __init__(self, session: Session, object_storage_client: Minio):
        """Initialize repository with a database session

        :param session: SQLAlchemy database session
        :param object_storage_client: Minio client for object storage operations
        """
        self.session = session
        self.object_storage_client = object_storage_client

    def upload_avatar(
        self, user_id: int, file: BinaryIO, file_size: int, content_type: str
    ) -> tuple[User, str] | None:
        user = self.session.query(User).filter_by(id=user_id).first()
        if not user:
            return None

        # Upload avatar to S3
        bucket_name = "avatars"

        # Create bucket if it doesn't exist
        if not self.object_storage_client.bucket_exists(bucket_name):
            self.object_storage_client.make_bucket(bucket_name)

        object_name = f"user_{user_id}_avatar.jpg"
        self.object_storage_client.put_object(
            bucket_name,
            object_name,
            file,
            file_size,
            content_type=content_type,
        )

        # Update user's avatar URL
        avatar_url = (
            f"{settings.S3_ENDPOINT}:{settings.S3_PORT}/{bucket_name}/{object_name}"
        )
        user.avatar_url = avatar_url
        self.session.commit()
        self.session.refresh(user)
        return user, avatar_url

    def upload_image_order(
        self, order_id: int, file: BinaryIO, file_size: int, content_type: str
    ) -> tuple[int, str] | None:

        bucket_name = "order-images"

        object_name = f"order_{order_id}_image_{uuid.uuid4()}.jpg"
        self.object_storage_client.put_object(
            bucket_name,
            object_name,
            file,
            file_size,
            content_type=content_type,
        )

        image_url = (
            f"{settings.S3_ENDPOINT}:{settings.S3_PORT}/{bucket_name}/{object_name}"
        )
        images_order = ImagesOrder(order_id=order_id, image_url=image_url)
        self.session.add(images_order)
        self.session.commit()
        return order_id, image_url

    def get_order_image(self, order_id: int, image_filename: str):
        """Get image from MinIO for order"""
        bucket_name = "order-images"
        return self.object_storage_client.get_object(bucket_name, image_filename)