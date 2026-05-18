from pydantic import BaseModel


class CreateBid(BaseModel):
    order_id: int
    comment: str | None = None


class ResponseBid(BaseModel):
    id: int
    order_id: int
    owner_id: int
    comment: str | None = None


class UpdateBid(BaseModel):
    comment: str | None = None
