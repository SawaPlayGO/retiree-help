from fastapi import APIRouter, Depends, status, HTTPException

from src.backend.schemas.auth import TokenPayloadSchema
from src.backend.schemas.bid import ResponseBid, UpdateBid
from src.backend.services.auth_service import AuthService
from src.backend.services.bid_service import BidService, CreateBid
from src.backend.utils.enums import Role
from src.backend.utils.exceptions import (
    BidAlreadyExistsError,
    BidNotFoundException,
    BidNotPermissionError,
)
from src.backend.utils.uow import get_uow, UnitOfWork


router = APIRouter(prefix="/bid", tags=["bids"])


@router.post("/", status_code=status.HTTP_201_CREATED, response_model=ResponseBid)
def create_bid(
    dto: CreateBid,
    payload: TokenPayloadSchema = Depends(AuthService.require_roles(Role.EXECUTOR)),
    uow: UnitOfWork = Depends(get_uow),
):
    """
    Create a new bid for an order.

    Parameters:
    - dto: The data for creating the bid

    Permission: Executor

    Returns:
    - Bid information
    """
    try:
        bid = BidService(uow=uow).create_bid(dto=dto, payload=payload)
        return bid
    except BidAlreadyExistsError as e:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, detail="Bid already exists"
        ) from e


@router.put("/{bid_id}", status_code=status.HTTP_200_OK, response_model=ResponseBid)
def update_bid(
    bid_id: int,
    dto: UpdateBid,
    payload: TokenPayloadSchema = Depends(AuthService.require_roles(Role.EXECUTOR)),
    uow: UnitOfWork = Depends(get_uow),
):
    """
    Update an existing bid.

    Parameters:
    - bid_id: The ID of the bid to update
    - dto: The data for updating the bid

    Permission: Executor

    Returns:
    - Updated bid information
    """
    try:
        bid = BidService(uow=uow).update_bid(bid_id=bid_id, dto=dto, payload=payload)
        return bid
    except BidAlreadyExistsError as e:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, detail="Bid already exists"
        ) from e
    except BidNotFoundException as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Bid not found"
        ) from e
    except BidNotPermissionError as e:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Permission denied"
        ) from e


@router.get("/{order_id}", status_code=status.HTTP_200_OK, response_model=list[ResponseBid])
def get_bids_by_order_id(
    order_id: int,
    payload: TokenPayloadSchema = Depends(
        AuthService.require_roles(Role.CUSTOMER)
    ),
    uow: UnitOfWork = Depends(get_uow),
):
    """
    Get all bids for a specific order.

    Parameters:
    - order_id: The ID of the order

    Permission: Customer

    Returns:
    - List of bids for the order
    """
    try:
        bids = BidService(uow=uow).get_bids_by_order_id(order_id=order_id)
        return bids
    except BidNotFoundException as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Bids not found"
        ) from e