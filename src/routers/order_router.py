from fastapi import APIRouter, status, Depends, HTTPException

from src.schemas.auth import TokenPayloadSchema
from src.schemas.order import CreateOrder, ResponseOrder, UpdateOrder
from src.services.auth_service import AuthService
from src.services.order_service import OrderService
from src.utils.enums import Role
from src.utils.exceptions import (
    OrderAlreadyAssignedException,
    OrderNotEnoughPermissions,
    OrderNotFoundException,
    OrderNotHaveThisExecutor,
    UserNotFoundException,
)
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


@router.put("/{order_id}", response_model=ResponseOrder)
def update_order(
    order_id: int,
    dto: UpdateOrder,
    payload: TokenPayloadSchema = Depends(AuthService.require_roles(Role.CUSTOMER)),
    uow: UnitOfWork = Depends(get_uow),
):
    """
    Update an existing order.

    Parameters:
    - order_id: The ID of the order to update
    - dto: The data for updating the order

    Permission: Customer

    Returns:
    - Updated order information
    """
    try:
        updated_order = OrderService(uow=uow).update_order(
            dto=dto, order_id=order_id, payload=payload
        )
    except OrderNotFoundException as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Order not found"
        ) from e
    except OrderNotEnoughPermissions as e:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions to update order",
        ) from e
    return updated_order


@router.put("/{order_id}/assign/{executor_id}", response_model=ResponseOrder)
def assign_executor(
    order_id: int,
    executor_id: int,
    payload: TokenPayloadSchema = Depends(AuthService.require_roles(Role.CUSTOMER)),
    uow: UnitOfWork = Depends(get_uow),
):
    """
    Assign an executor to an order.

    Parameters:
    - order_id: The ID of the order to assign
    - executor_id: The ID of the executor to assign

    Permission: Customer

    Returns:
    - Updated order information with assigned executor
    """
    try:
        order = OrderService(uow=uow).assign_executor(
            order_id=order_id, executor_id=executor_id, payload=payload
        )
    except OrderNotFoundException as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Order not found"
        ) from e
    except OrderNotEnoughPermissions as e:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions to assign executor",
        ) from e
    except OrderAlreadyAssignedException as e:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Order already has an executor assigned",
        ) from e
    except OrderNotHaveThisExecutor as e:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="The specified executor does not have a bid for this order",
        ) from e
    return order
