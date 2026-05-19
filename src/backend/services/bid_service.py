from src.backend.schemas.bid import CreateBid, ResponseBid, UpdateBid
from src.backend.services.auth_service import IntegrityError, TokenPayloadSchema
from src.backend.utils.exceptions import (
    BidAlreadyExistsError,
    BidNotFoundException,
    BidNotPermissionError,
)
from src.backend.utils.uow import UnitOfWork


class BidService:
    uow: UnitOfWork

    def __init__(self, uow: UnitOfWork):
        self.uow = uow

    def create_bid(self, dto: CreateBid, payload: TokenPayloadSchema) -> ResponseBid:
        bid_data = dto.model_dump()
        bid_data["owner_id"] = payload.user_id
        try:
            bid = self.uow.bid_repository.create_bid(bid_data=bid_data)
            return ResponseBid(**bid.__dict__)
        except IntegrityError as e:
            if "uq_bid_owner_order" in str(e):
                raise BidAlreadyExistsError() from e

    def update_bid(
        self, dto: UpdateBid, bid_id: int, payload: TokenPayloadSchema
    ) -> ResponseBid:
        bid_data = dto.model_dump(exclude_unset=True)
        bid = self.uow.bid_repository.get_bid_by_id(bid_id=bid_id)
        if not bid:
            raise BidNotFoundException()
        if bid.owner_id != payload.user_id:
            raise BidNotPermissionError()

        bid = self.uow.bid_repository.update_bid(update_data=bid_data, bid_id=bid_id)
        return ResponseBid(**bid.__dict__)

    def get_bids_for_order(
        self, order_id: int, payload: TokenPayloadSchema
    ) -> list[ResponseBid]:
        bids = self.uow.bid_repository.get_bids_by_order_id(order_id=order_id)
        return [ResponseBid(**bid.__dict__) for bid in bids]

    def delete_bid(self, bid_id: int, payload: TokenPayloadSchema) -> None:
        bid = self.uow.bid_repository.get_bid_by_id(bid_id=bid_id)
        if not bid:
            raise BidNotFoundException()
        if bid.owner_id != payload.user_id:
            raise BidNotPermissionError()

        self.uow.bid_repository.delete_bid(bid_id=bid_id)

    def get_bids_by_order_id(self, order_id: int) -> list[ResponseBid]:
        bids = self.uow.bid_repository.get_bids_by_order_id(order_id=order_id)
        return [ResponseBid(**bid.__dict__) for bid in bids]