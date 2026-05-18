from sqlalchemy import Column, Enum, Float, ForeignKey, Integer, String

from src.database import Base
from src.utils.enums import OrderStatus


class Order(Base):
    __tablename__ = "orders"

    id = Column(Integer, primary_key=True, index=True)
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    executor_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    title = Column(String, nullable=False)
    description = Column(String, nullable=False)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    status = Column(Enum(OrderStatus), nullable=False, default=OrderStatus.OPEN)

    def __repr__(self):
        return f"<Order(id={self.id}, owner_id={self.owner_id}, title={self.title}, description={self.description}, latitude={self.latitude}, longitude={self.longitude}, status={self.status})>"
