from pydantic import BaseModel, ConfigDict, computed_field


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
    latitude: float
    longitude: float
    status: str

    @computed_field
    @property
    def location(self) -> Location:
        return Location(latitude=self.latitude, longitude=self.longitude)


class UpdateOrder(BaseModel):
    title: str | None = None
    description: str | None = None
    location: Location | None = None
