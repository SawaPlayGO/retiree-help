from fastapi import UploadFile

from src.backend.schemas.image import ResponseAvatar, ResponseImagesOrder
from src.backend.services.auth_service import TokenPayloadSchema
from src.backend.services.order_service import OrderService
from src.backend.utils.exceptions import OrderNotEnoughPermissions, OrderNotFoundException
from src.backend.utils.uow import UnitOfWork


class ImageService:
    uow: UnitOfWork

    def __init__(self, uow: UnitOfWork):
        self.uow = uow

    def upload_avatar(
        self, image: UploadFile, payload: TokenPayloadSchema
    ) -> ResponseAvatar:
        _, avatar_url = self.uow.image_repository.upload_avatar(
            user_id=payload.user_id,
            file=image.file,
            file_size=image.size,
            content_type=image.content_type,
        )
        return ResponseAvatar.model_validate({"url_avatar": avatar_url})

    def upload_images_order(self, order_id: int, images: list[UploadFile], payload: TokenPayloadSchema, order_service: OrderService) -> ResponseImagesOrder:
        order = order_service.get_order_by_id(order_id=order_id, payload=payload)
        if not order:
            raise OrderNotFoundException()
        elif order.owner_id != payload.user_id:
            raise OrderNotEnoughPermissions()
        image_urls = []
        for image in images:
            _, image_url = self.uow.image_repository.upload_image_order(
                order_id=order_id,
                file=image.file,
                file_size=image.size,
                content_type=image.content_type,
            )
            image_urls.append(image_url)
        return ResponseImagesOrder.model_validate({"image_urls": image_urls})

    def get_order_image(self, order_id: int, image_filename: str):
        """Get image from MinIO for order"""
        return self.uow.image_repository.get_order_image(order_id, image_filename)