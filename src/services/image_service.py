from fastapi import UploadFile

from src.schemas.image import ResponseAvatar
from src.services.auth_service import TokenPayloadSchema
from src.utils.uow import UnitOfWork


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
