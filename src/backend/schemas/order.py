from pydantic import BaseModel, ConfigDict, Field, computed_field

from src.backend.models.order import Order
from src.backend.utils.enums import OrderStatus


class Location(BaseModel):
    latitude: float
    longitude: float


class CreateOrder(BaseModel):
    title: str
    description: str
    location: Location


class ResponseOrder(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    owner_id: int
    executor_id: int | None = None
    title: str
    description: str
    image_urls: list[str] = Field(default_factory=list)
    latitude: float
    longitude: float
    status: OrderStatus

    @computed_field
    @property
    def location(self) -> Location:
        return Location(latitude=self.latitude, longitude=self.longitude)

    @classmethod
    def from_orm(cls, order: Order):
        return cls(
            id=order.id,
            owner_id=order.owner_id,
            executor_id=order.executor_id,
            title=order.title,
            description=order.description,
            latitude=order.latitude,
            longitude=order.longitude,
            status=order.status,
            image_urls=[img.image_url for img in order.images],
        )


class UpdateOrder(BaseModel):
    title: str | None = None
    description: str | None = None
    location: Location | None = None


class PaginatedResponseOrder(BaseModel):
    items: list[ResponseOrder]
    total: int
    skip: int
    limit: int

    @computed_field
    @property
    def total_pages(self) -> int:
        return (self.total + self.limit - 1) // self.limit if self.limit > 0 else 0

    @computed_field
    @property
    def current_page(self) -> int:
        return (self.skip // self.limit) + 1 if self.limit > 0 else 1
