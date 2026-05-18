from pydantic import BaseModel


class ResponseAvatar(BaseModel):
    url_avatar: str


class UpdateAvatar(BaseModel):
    comment: str | None = None
