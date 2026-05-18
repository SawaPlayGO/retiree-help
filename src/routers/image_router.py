from fastapi import APIRouter, Depends, File, UploadFile, status

from src.schemas.auth import TokenPayloadSchema
from src.schemas.image import ResponseAvatar
from src.services.auth_service import AuthService, HTTPException
from src.services.image_service import ImageService
from src.utils.enums import Role
from src.utils.uow import get_uow, UnitOfWork


router = APIRouter(prefix="/image", tags=["images"])


@router.post(
    "/upload_avatar", status_code=status.HTTP_201_CREATED, response_model=ResponseAvatar
)
def upload_avatar(
    image: UploadFile = File(...),
    payload: TokenPayloadSchema = Depends(
        AuthService.require_roles(Role.EXECUTOR, Role.CUSTOMER)
    ),
    uow: UnitOfWork = Depends(get_uow),
):
    return ImageService(uow=uow).upload_avatar(image=image, payload=payload)
