from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from src.models.order import Order
from src.utils.enums import OrderStatus


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
        return self.session.query(Order).filter_by(id=order_id).first()

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
