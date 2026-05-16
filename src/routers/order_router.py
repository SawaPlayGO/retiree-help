
from fastapi import APIRouter, status, Depends, HTTPException

from src.schemas.auth import TokenPayloadSchema
from src.schemas.order import CreateOrder, ResponseOrder
from src.services.auth_service import AuthService
from src.services.order_service import OrderService
from src.utils.enums import Role
from src.utils.exceptions import UserNotFoundException
from src.utils.uow import UnitOfWork, get_uow


router = APIRouter(prefix="/order", tags=["orders"])


@router.post("/", status_code=status.HTTP_201_CREATED, response_model=ResponseOrder)
def create_order(
    dto: CreateOrder,
    payload: TokenPayloadSchema = Depends(AuthService.require_roles(Role.CUSTOMER)),
    uow: UnitOfWork = Depends(get_uow),
):
    """
    Create a new order.

    Parameters:
    - dto: The data for creating the order

    Permission: Customer

    Returns:
    - Order information
    """
    try:
        order = OrderService(uow=uow).create_order(dto=dto, payload=payload)
    except UserNotFoundException as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="User not found"
        ) from e
    return order