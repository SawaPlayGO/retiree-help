from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from src.models.order import Order


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
    
    def remove_order(self, order_id: int) -> None:
        ...

    def update_order(self, order_id: int, update_data: dict) -> None:
        ...

    def get_order_by_owner_id(self, owner_id: int) -> list[dict] | None:
        ...