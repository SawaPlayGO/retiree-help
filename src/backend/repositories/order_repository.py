from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, selectinload

from src.backend.models.order import Order
from src.backend.models.bid import Bid
from src.backend.utils.enums import OrderStatus


class OrderRepository:
    """Repository for order data access operations"""

    def __init__(self, session: Session):
        """Initialize repository with a database session

        :param session: SQLAlchemy database session
        """
        self.session = session

    def create_order(self, order_data: dict) -> Order | None:
        try:
            order = Order(**order_data)

            self.session.add(order)
            self.session.commit()
            self.session.refresh(order)

            return order

        except IntegrityError:
            self.session.rollback()
            raise

    def remove_order(self, order_id: int) -> None: ...

    def update_order(self, order_id: int, update_data: dict) -> Order | None:
        order = self.session.query(Order).filter_by(id=order_id).first()
        if not order:
            return None

        for key, value in update_data.items():
            setattr(order, key, value)

        self.session.commit()
        self.session.refresh(order)
        return order

    def get_order_by_owner_id(self, owner_id: int) -> list[dict] | None: ...

    def get_order_by_id(self, order_id: int) -> Order | None:
        return (
            self.session.query(Order)
            .options(selectinload(Order.images))
            .filter(Order.id == order_id)
            .first()
        )

    def assign_executor(self, order_id: int, executor_id: int) -> Order | None:
        order = self.session.query(Order).filter_by(id=order_id).first()
        if not order:
            return None

        order.executor_id = executor_id
        self.session.commit()
        self.session.refresh(order)
        return order

    def update_order_status(self, order_id: int, status: OrderStatus) -> Order | None:
        order = self.session.query(Order).filter_by(id=order_id).first()
        if not order:
            return None

        order.status = status
        self.session.commit()
        self.session.refresh(order)
        return order


    def get_all_orders(self, skip: int = 0, limit: int = 10) -> tuple[list[Order], int]:
        query = (
            self.session.query(Order)
            .filter(Order.status == OrderStatus.OPEN.value)
            .options(selectinload(Order.images))
        )
        total = query.count()
        orders = query.offset(skip).limit(limit).all()
        return orders, total

    def get_orders_by_executor_bids(self, executor_id: int, skip: int = 0, limit: int = 10) -> tuple[list[Order], int]:
        """Get all orders where executor has placed bids"""
        # Get all order_ids where executor has placed bids
        bid_orders = (
            self.session.query(Bid.order_id)
            .filter(Bid.owner_id == executor_id)
            .distinct()
            .all()
        )
        order_ids = [bid[0] for bid in bid_orders]
        
        if not order_ids:
            return [], 0
        
        query = (
            self.session.query(Order)
            .filter(Order.id.in_(order_ids))
            .options(selectinload(Order.images))
        )
        total = query.count()
        orders = query.offset(skip).limit(limit).all()
        return orders, total

    def get_orders_by_owner_id(self, owner_id: int, skip: int = 0, limit: int = 10) -> tuple[list[Order], int]:
        """Get all orders created by owner"""
        query = (
            self.session.query(Order)
            .filter(Order.owner_id == owner_id)
            .options(selectinload(Order.images))
        )
        total = query.count()
        orders = query.offset(skip).limit(limit).all()
        return orders, total