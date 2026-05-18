from sqlalchemy import Column, Integer, String, ForeignKey
from sqlalchemy.sql.schema import UniqueConstraint

from src.database import Base


class Bid(Base):
    """Bid model for database"""

    __tablename__ = "bids"

    __table_args__ = (
        UniqueConstraint("owner_id", "order_id", name="uq_bid_owner_order"),
    )

    id = Column(Integer, primary_key=True, index=True)
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    order_id = Column(Integer, ForeignKey("orders.id"), nullable=False)
    comment = Column(String(255), nullable=True)

    def __repr__(self):
        return f"<Bid(id={self.id}, owner_id={self.owner_id}, order_id={self.order_id}, comment={self.comment})>"
