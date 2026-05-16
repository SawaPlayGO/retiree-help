
from src.schemas.auth import TokenPayloadSchema
from src.schemas.order import CreateOrder, ResponseOrder
from src.utils.uow import UnitOfWork


class OrderService:
    uow: UnitOfWork

    def __init__(self, uow: UnitOfWork):
        self.uow = uow

    def create_order(self, dto: CreateOrder, payload: TokenPayloadSchema) -> ResponseOrder:
        order_data = dto.model_dump()
        order_data["owner_id"] = payload.user_id
        # Extract location nested object into latitude and longitude
        location = order_data.pop("location")
        order_data["latitude"] = location["latitude"]
        order_data["longitude"] = location["longitude"]
        order = self.uow.order_repository.create_order(order_data=order_data)
        return ResponseOrder.model_validate(order)