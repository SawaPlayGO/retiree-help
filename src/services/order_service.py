from src.schemas.auth import TokenPayloadSchema
from src.schemas.order import CreateOrder, ResponseOrder, UpdateOrder
from src.utils.enums import OrderStatus
from src.utils.exceptions import (
    OrderAlreadyAssignedException,
    OrderNotEnoughPermissions,
    OrderNotFoundException,
    OrderNotHaveThisExecutor,
)
from src.utils.uow import UnitOfWork


class OrderService:
    uow: UnitOfWork

    def __init__(self, uow: UnitOfWork):
        self.uow = uow

    def create_order(
        self, dto: CreateOrder, payload: TokenPayloadSchema
    ) -> ResponseOrder:
        order_data = dto.model_dump()
        order_data["owner_id"] = payload.user_id
        location = order_data.pop("location")
        order_data["latitude"] = location["latitude"]
        order_data["longitude"] = location["longitude"]
        order = self.uow.order_repository.create_order(order_data=order_data)
        return ResponseOrder.model_validate(order)

    def update_order(
        self, dto: UpdateOrder, order_id: int, payload: TokenPayloadSchema
    ) -> ResponseOrder:
        update_data = dto.model_dump(exclude_unset=True)
        order = self.uow.order_repository.get_order_by_id(order_id=order_id)
        if not order:
            raise OrderNotFoundException()
        if order.owner_id != payload.user_id:
            raise OrderNotEnoughPermissions()
        # Handle nested location object
        if "location" in update_data and update_data["location"]:
            location = update_data.pop("location")
            update_data["latitude"] = location.get("latitude")
            update_data["longitude"] = location.get("longitude")
        order = self.uow.order_repository.update_order(
            update_data=update_data, order_id=order_id
        )
        updated_order = self.uow.order_repository.get_order_by_id(order_id=order_id)
        return ResponseOrder.model_validate(updated_order)

    def assign_executor(
        self, order_id: int, executor_id: int, payload: TokenPayloadSchema
    ) -> ResponseOrder:
        order = self.uow.order_repository.get_order_by_id(order_id=order_id)
        if not order:
            raise OrderNotFoundException()
        if order.owner_id != payload.user_id:
            raise OrderNotEnoughPermissions()
        if order.executor_id is not None:
            raise OrderAlreadyAssignedException()

        bids = self.uow.bid_repository.get_bids_by_order_id(order_id=order_id)
        if executor_id not in [bid.owner_id for bid in bids]:
            raise OrderNotHaveThisExecutor()
        order = self.uow.order_repository.assign_executor(
            order_id=order_id, executor_id=executor_id
        )
        self.uow.order_repository.update_order_status(
            order_id=order_id, status=OrderStatus.IN_PROGRESS
        )
        return ResponseOrder.model_validate(order)
