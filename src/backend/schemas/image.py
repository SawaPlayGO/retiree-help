from pydantic import BaseModel


class ResponseAvatar(BaseModel):
    url_avatar: str

class ResponseImagesOrder(BaseModel):
    image_urls: list[str]


class UpdateAvatar(BaseModel):
    comment: str | None = None
