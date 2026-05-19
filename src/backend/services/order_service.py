from src.backend.schemas.auth import TokenPayloadSchema
from src.backend.schemas.order import CreateOrder, ResponseOrder, UpdateOrder
from src.backend.utils.enums import OrderStatus, Role
from src.backend.utils.exceptions import (
    OrderAlreadyAssignedException,
    OrderNotEnoughPermissions,
    OrderNotFoundException,
    OrderNotHaveThisExecutor,
    OrderNotInProgressException,
    OrderNotAwaitingApprovalException,
)
from src.backend.utils.uow import UnitOfWork


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

    def get_order_by_id(self, order_id: int, payload: TokenPayloadSchema) -> ResponseOrder:
        order = self.uow.order_repository.get_order_by_id(order_id=order_id)
        if not order:
            raise OrderNotFoundException()
        if order.owner_id != payload.user_id and payload.role != Role.EXECUTOR:
            raise OrderNotEnoughPermissions()
        return ResponseOrder.from_orm(order)

    def complete_executor_work(self, order_id: int, payload: TokenPayloadSchema) -> ResponseOrder:
        """Mark order as completed by executor
        
        Only executor assigned to this order can mark it as completed.
        Order must be IN_PROGRESS.
        """
        order = self.uow.order_repository.get_order_by_id(order_id=order_id)
        if not order:
            raise OrderNotFoundException()
        
        if order.executor_id != payload.user_id:
            raise OrderNotEnoughPermissions()
        
        if order.status != OrderStatus.IN_PROGRESS:
            raise OrderNotInProgressException()
        
        order = self.uow.order_repository.update_order_status(
            order_id=order_id, status=OrderStatus.AWAITING_APPROVAL
        )
        return ResponseOrder.model_validate(order)

    def approve_completion(self, order_id: int, payload: TokenPayloadSchema) -> ResponseOrder:
        """Approve order completion by customer
        
        Only order owner (customer) can approve completion.
        Order must be AWAITING_APPROVAL.
        """
        order = self.uow.order_repository.get_order_by_id(order_id=order_id)
        if not order:
            raise OrderNotFoundException()
        
        # Verify it's the order owner
        if order.owner_id != payload.user_id:
            raise OrderNotEnoughPermissions()
        
        # Order must be awaiting approval
        if order.status != OrderStatus.AWAITING_APPROVAL:
            raise OrderNotAwaitingApprovalException()
        
        order = self.uow.order_repository.update_order_status(
            order_id=order_id, status=OrderStatus.COMPLETED
        )
        return ResponseOrder.model_validate(order)

    def send_for_revision(self, order_id: int, payload: TokenPayloadSchema) -> ResponseOrder:
        """Send order work back for revision by customer
        
        Only order owner (customer) can send for revision.
        Order must be AWAITING_APPROVAL.
        """
        order = self.uow.order_repository.get_order_by_id(order_id=order_id)
        if not order:
            raise OrderNotFoundException()
        
        # Verify it's the order owner
        if order.owner_id != payload.user_id:
            raise OrderNotEnoughPermissions()
        
        # Order must be awaiting approval
        if order.status != OrderStatus.AWAITING_APPROVAL:
            raise OrderNotAwaitingApprovalException()
        
        order = self.uow.order_repository.update_order_status(
            order_id=order_id, status=OrderStatus.NEEDS_REVISION
        )
        return ResponseOrder.model_validate(order)

    def resubmit_revised_work(self, order_id: int, payload: TokenPayloadSchema) -> ResponseOrder:
        """Resubmit revised work by executor after being sent for revision
        
        Only executor assigned to this order can resubmit revised work.
        Order must be NEEDS_REVISION.
        """
        order = self.uow.order_repository.get_order_by_id(order_id=order_id)
        if not order:
            raise OrderNotFoundException()
        
        # Verify it's the assigned executor
        if order.executor_id != payload.user_id:
            raise OrderNotEnoughPermissions()
        
        # Order must be in needs revision state
        if order.status != OrderStatus.NEEDS_REVISION:
            raise OrderNotAwaitingApprovalException()
        
        order = self.uow.order_repository.update_order_status(
            order_id=order_id, status=OrderStatus.AWAITING_APPROVAL
        )
        return ResponseOrder.model_validate(order)

    def cancel_order(self, order_id: int) -> ResponseOrder:
        """Cancel an order (admin only)
        
        Cancels an order. Only admins can perform this action.
        """
        order = self.uow.order_repository.get_order_by_id(order_id=order_id)
        if not order:
            raise OrderNotFoundException()
        
        order = self.uow.order_repository.update_order_status(
            order_id=order_id, status=OrderStatus.CANCELLED
        )
        return ResponseOrder.model_validate(order)

    def get_all_orders(self, skip: int = 0, limit: int = 10) -> dict:
        orders, total = self.uow.order_repository.get_all_orders(skip=skip, limit=limit)
        return {
            "items": [ResponseOrder.model_validate(order) for order in orders],
            "total": total,
            "skip": skip,
            "limit": limit,
        }

    def get_executor_bid_orders(self, payload: TokenPayloadSchema, skip: int = 0, limit: int = 10) -> dict:
        """Get all orders where executor has placed bids
        
        Returns paginated list of orders where the executor has placed bids.
        """
        orders, total = self.uow.order_repository.get_orders_by_executor_bids(
            executor_id=payload.user_id, skip=skip, limit=limit
        )
        return {
            "items": [ResponseOrder.model_validate(order) for order in orders],
            "total": total,
            "skip": skip,
            "limit": limit,
        }

    def get_customer_orders(self, payload: TokenPayloadSchema, skip: int = 0, limit: int = 10) -> dict:
        """Get all orders created by current customer
        
        Returns paginated list of orders created by the current user.
        """
        orders, total = self.uow.order_repository.get_orders_by_owner_id(
            owner_id=payload.user_id, skip=skip, limit=limit
        )
        return {
            "items": [ResponseOrder.model_validate(order) for order in orders],
            "total": total,
            "skip": skip,
            "limit": limit,
        }