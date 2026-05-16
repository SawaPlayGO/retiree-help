from datetime import UTC, datetime, timedelta

from fastapi import Depends, HTTPException
from fastapi import status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.exc import IntegrityError

from src.schemas.auth import (
    AccessTokenSchema,
    LoginSchema,
    RegisterSchema,
    TokenPayloadSchema,
)
from src.utils.enums import Role
from src.utils.exceptions import (
    EmailAlreadyExists,
    NotValidRoleException,
    PasswordNotInvalidException,
    UserNotFoundException,
    UsernameAlreadyExists,
)
from src.utils.uow import UnitOfWork

import bcrypt
import jwt
from src.config import settings

security = HTTPBearer()


class AuthService:
    uow: UnitOfWork

    def __init__(self, uow: UnitOfWork):
        self.uow = uow

    def create_user(self, dto: RegisterSchema) -> AccessTokenSchema:
        password_hash = AuthService.hash_password(dto.password)

        role = dto.role.value
        if role not in [Role.EXECUTOR.value, Role.CUSTOMER.value]:
            raise NotValidRoleException()

        user_data = {
            "email": dto.email,
            "username": dto.username,
            "password_hash": password_hash,
            "role": role,
        }
        try:
            self.uow.auth_repository.create_user(user_data=user_data)
        except IntegrityError as e:
            error_message = str(e.orig)

            if "ix_users_email" in error_message:
                raise EmailAlreadyExists()

            if "ix_users_username" in error_message:
                raise UsernameAlreadyExists()

            raise

        return AccessTokenSchema(access_token=AuthService.generate_token(user_data))

    def login_user(self, dto: LoginSchema) -> AccessTokenSchema:
        user_is_exests = self.uow.auth_repository.check_user_exists_by_email(
            email=dto.email
        )
        if not user_is_exests:
            raise UserNotFoundException()

        password_is_correct = self.uow.auth_repository.check_password_hash(
            email=dto.email, password=dto.password
        )
        if not password_is_correct:
            raise PasswordNotInvalidException()

        user = self.uow.auth_repository.get_user_by_email(email=dto.email)
        if not user:
            raise UserNotFoundException()

        password_hash = AuthService.hash_password(dto.password)
        user_data = {
            "user_id": user.id,
            "email": dto.email,
            "password_hash": password_hash,
            "role": user.role,
        }
        return AccessTokenSchema(access_token=AuthService.generate_token(user_data))

    def remove_user(self):
        pass

    @staticmethod
    def verify_jwt(
        credentials: HTTPAuthorizationCredentials = Depends(security),
    ) -> TokenPayloadSchema:
        """
        Проверяет JWT токен.

        Args:
            credentials (HTTPAuthorizationCredentials): Bearer token.

        Raises:
            HTTPException: Если токен невалиден или истёк.

        Returns:
            TokenPayloadSchema: Payload JWT токена.
        """
        token = credentials.credentials

        try:
            payload = jwt.decode(
                token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM]
            )

            return TokenPayloadSchema(**payload)

        except jwt.ExpiredSignatureError:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED, detail="Token expired"
            )

        except jwt.InvalidTokenError:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token"
            )

    @staticmethod
    def require_roles(*roles: Role):
        def checker(user: TokenPayloadSchema = Depends(AuthService.verify_jwt)):
            allowed_roles = [r.value for r in roles]
            if user.role not in allowed_roles:
                raise HTTPException(status_code=403, detail="Forbidden")
            return user
        return checker

    @staticmethod
    def hash_password(password: str) -> str:
        """
        Хеширует пароль с использованием bcrypt.

        Args:
            password (str): Обычный пароль пользователя.

        Returns:
            str: Хешированный пароль (utf-8 строка).
        """
        salt = bcrypt.gensalt()
        hashed = bcrypt.hashpw(password.encode("utf-8"), salt)
        return hashed.decode("utf-8")

    @staticmethod
    def generate_token(user_data: dict) -> str:
        """
        Генерирует JWT access token.

        Args:
            user_data (dict): Данные пользователя.

        Returns:
            str: JWT токен.
        """
        now = datetime.now(UTC)

        payload = {
            "user_id": user_data["user_id"],
            "email": user_data["email"],
            "role": user_data["role"],
            "iat": now,
            "exp": now + timedelta(hours=settings.ACCESS_TOKEN_EXPIRE_HOURS),
        }

        token = jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)

        return token
