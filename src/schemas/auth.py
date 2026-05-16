from pydantic import BaseModel, EmailStr
from src.utils.enums import Role


class RegisterSchema(BaseModel):
    role: Role
    email: EmailStr
    username: str
    password: str


class TokenPayloadSchema(BaseModel):
    user_id: int
    email: EmailStr
    role: Role
    iat: int
    exp: int


class AccessTokenSchema(BaseModel):
    access_token: str


class LoginSchema(BaseModel):
    email: EmailStr
    password: str
