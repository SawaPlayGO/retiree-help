from src.schemas.bid import CreateBid, ResponseBid, UpdateBid
from src.services.auth_service import IntegrityError, TokenPayloadSchema
from src.utils.exceptions import (
    BidAlreadyExistsError,
    BidNotFoundException,
    BidNotPermissionError,
)
from src.utils.uow import UnitOfWork


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
