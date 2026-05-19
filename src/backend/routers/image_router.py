
from fastapi import APIRouter, Depends, File, UploadFile, status
from fastapi.responses import StreamingResponse

from src.backend.schemas.auth import TokenPayloadSchema
from src.backend.schemas.image import ResponseAvatar, ResponseImagesOrder
from src.backend.services.auth_service import AuthService, HTTPException
from src.backend.services.image_service import ImageService
from src.backend.services.order_service import OrderService
from src.backend.utils.enums import Role
from src.backend.utils.exceptions import OrderNotEnoughPermissions, OrderNotFoundException
from src.backend.utils.uow import get_uow, UnitOfWork


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


@router.post(
    "/upload_images_order/{order_id}",
    status_code=status.HTTP_200_OK,
    response_model=ResponseImagesOrder,
    openapi_extra={
        "requestBody": {
            "content": {
                "multipart/form-data": {
                    "schema": {
                        "type": "object",
                        "properties": {
                            "images": {
                                "type": "array",
                                "items": {
                                    "type": "string",
                                    "format": "binary",
                                },
                                "description": "Список изображений для заказа",
                            }
                        },
                        "required": ["images"],
                    }
                }
            }
        }
    },
)
def upload_images_order(
    order_id: int,
    images: list[UploadFile] = File(...),
    payload: TokenPayloadSchema = Depends(AuthService.require_roles(Role.CUSTOMER)),
    uow: UnitOfWork = Depends(get_uow),
):
    try:
        order_service = OrderService(uow=uow)
        return ImageService(uow=uow).upload_images_order(
            order_id=order_id, images=images, payload=payload, order_service=order_service
        )
    except OrderNotFoundException as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Order not found"
        ) from e
    except OrderNotEnoughPermissions as e:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions to upload images for this order",
        ) from e


@router.get("/order/{order_id}/{image_filename}")
def get_order_image(
    order_id: int,
    image_filename: str,
    uow: UnitOfWork = Depends(get_uow),
):
    """Get image for order - proxies through backend to avoid CORS issues"""
    try:
        image_data = ImageService(uow=uow).get_order_image(
            order_id=order_id, 
            image_filename=image_filename
        )
        return StreamingResponse(
            image_data,
            media_type="image/jpeg",
            headers={"Content-Disposition": f"inline; filename={image_filename}"}
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Image not found"
        ) from e
