from pydantic import BaseModel, ConfigDict


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
    title: str
    description: str
    latitude: float
    longitude: float
    status: str