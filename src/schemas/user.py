from datetime import datetime
from pydantic import BaseModel


class UserUpdateSchema(BaseModel):
    description: str | None = None


class GetUserSchema(BaseModel):
    user_id: int
    username: str
    email: str
    description: str | None = None
    photo_path: str | None = None
    role: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
