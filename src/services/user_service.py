from sqlalchemy.exc import IntegrityError

from src.models.auth import User
from src.schemas.user import GetUserSchema, UserUpdateSchema
from src.utils.exceptions import UserNotFoundException, UsernameAlreadyExists
from src.utils.uow import UnitOfWork


class UserService:
    uow: UnitOfWork

    def __init__(self, uow: UnitOfWork):
        self.uow = uow

    def update_user(self, dto: UserUpdateSchema, user_id: int) -> User:
        update_data = dto.model_dump(exclude_unset=True)
        user = self.uow.user_repository.update_user(
            update_data=update_data, user_id=user_id
        )
        if not user:
            raise UserNotFoundException()
        updated_user = self.uow.user_repository.get_user_by_id(user_id=user_id)
        return updated_user

    def get_user_by_user_id(self, user_id: int) -> GetUserSchema:
        user = self.uow.user_repository.get_user_by_id(user_id=user_id)
        if not user:
            raise UserNotFoundException()
        return GetUserSchema.model_validate(user)

    def upload_avatar(
        self, user_id: int, file: bytes, file_size: int, content_type: str
    ) -> User:
        user = self.uow.user_repository.upload_avatar(
            user_id=user_id, file=file, file_size=file_size, content_type=content_type
        )
        if not user:
            raise UserNotFoundException()
        return user
