from fastapi import APIRouter, status, Depends, HTTPException

from src.backend.schemas.auth import TokenPayloadSchema
from src.backend.schemas.order import CreateOrder, ResponseOrder, UpdateOrder
from src.backend.services.auth_service import AuthService
from src.backend.services.order_service import OrderService
from src.backend.utils.enums import Role
from src.backend.utils.exceptions import (
    OrderAlreadyAssignedException,
    OrderNotEnoughPermissions,
    OrderNotFoundException,
    OrderNotHaveThisExecutor,
    UserNotFoundException,
    OrderNotInProgressException,
    OrderNotAwaitingApprovalException,
)
from src.backend.utils.uow import UnitOfWork, get_uow


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

@router.get("/all", status_code=status.HTTP_200_OK)
def get_all_orders(
    skip: int = 0,
    limit: int = 10,
    payload: TokenPayloadSchema = Depends(AuthService.require_roles(Role.EXECUTOR)),
    uow: UnitOfWork = Depends(get_uow),
):
    """
    Get all orders with pagination.

    Parameters:
    - skip: Number of orders to skip (default: 0)
    - limit: Number of orders to return (default: 10, max: 100)

    Permission: Executor

    Returns:
    - Paginated list of orders
    """
    # Limit max page size
    limit = min(limit, 100)
    try:
        result = OrderService(uow=uow).get_all_orders(skip=skip, limit=limit)
        return result
    except OrderNotFoundException as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Orders not found"
        ) from e


@router.get("/my-bids", status_code=status.HTTP_200_OK)
def get_executor_bid_orders(
    skip: int = 0,
    limit: int = 10,
    payload: TokenPayloadSchema = Depends(AuthService.require_roles(Role.EXECUTOR)),
    uow: UnitOfWork = Depends(get_uow),
):
    """
    Get all orders where executor has placed bids.

    Parameters:
    - skip: Number of orders to skip (default: 0)
    - limit: Number of orders to return (default: 10, max: 100)

    Permission: Executor

    Returns:
    - Paginated list of orders with bids from current executor
    """
    # Limit max page size
    limit = min(limit, 100)
    try:
        result = OrderService(uow=uow).get_executor_bid_orders(
            payload=payload, skip=skip, limit=limit
        )
        return result
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Server error"
        ) from e


@router.get("/my", status_code=status.HTTP_200_OK)
def get_my_orders(
    skip: int = 0,
    limit: int = 10,
    payload: TokenPayloadSchema = Depends(AuthService.require_roles(Role.CUSTOMER)),
    uow: UnitOfWork = Depends(get_uow),
):
    """
    Get all orders created by current user.

    Parameters:
    - skip: Number of orders to skip (default: 0)
    - limit: Number of orders to return (default: 10, max: 100)

    Permission: Customer

    Returns:
    - Paginated list of orders created by current user
    """
    # Limit max page size
    limit = min(limit, 100)
    try:
        result = OrderService(uow=uow).get_customer_orders(
            payload=payload, skip=skip, limit=limit
        )
        return result
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Server error"
        ) from e


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

@router.get("/{order_id}", response_model=ResponseOrder)
def get_order(
    order_id: int,
    payload: TokenPayloadSchema = Depends(
        AuthService.require_roles(Role.EXECUTOR, Role.CUSTOMER)
    ),
    uow: UnitOfWork = Depends(get_uow),
):
    try:
        order = OrderService(uow=uow).get_order_by_id(order_id=order_id, payload=payload)
    except OrderNotFoundException as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Order not found"
        ) from e
    except OrderNotEnoughPermissions as e:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions to view order",
        ) from e
    return order


@router.put("/{order_id}/complete", response_model=ResponseOrder)
def complete_executor_work(
    order_id: int,
    payload: TokenPayloadSchema = Depends(AuthService.require_roles(Role.EXECUTOR)),
    uow: UnitOfWork = Depends(get_uow),
):
    """
    Mark order work as completed by executor.
    
    The assigned executor confirms that the work is done.
    This changes order status to AWAITING_APPROVAL.
    
    Permission: Executor (assigned to the order)
    
    Returns:
    - Updated order information
    """
    try:
        order = OrderService(uow=uow).complete_executor_work(
            order_id=order_id, payload=payload
        )
    except OrderNotFoundException as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Order not found"
        ) from e
    except OrderNotEnoughPermissions as e:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not the assigned executor for this order",
        ) from e
    except OrderNotInProgressException as e:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Order is not in progress",
        ) from e
    return order


@router.put("/{order_id}/approve", response_model=ResponseOrder)
def approve_completion(
    order_id: int,
    payload: TokenPayloadSchema = Depends(AuthService.require_roles(Role.CUSTOMER)),
    uow: UnitOfWork = Depends(get_uow),
):
    """
    Approve order completion by customer.
    
    The order owner confirms that the work meets their requirements.
    This changes order status to COMPLETED.
    
    Permission: Customer (order owner)
    
    Returns:
    - Updated order information
    """
    try:
        order = OrderService(uow=uow).approve_completion(
            order_id=order_id, payload=payload
        )
    except OrderNotFoundException as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Order not found"
        ) from e
    except OrderNotEnoughPermissions as e:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not the order owner",
        ) from e
    except OrderNotAwaitingApprovalException as e:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Order is not awaiting approval",
        ) from e
    return order