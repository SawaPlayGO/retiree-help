from sqlalchemy.exc import IntegrityError

from src.models.auth import User
from src.schemas.user import UserUpdateSchema
from src.utils.exceptions import UserNotFoundException, UsernameAlreadyExists
from src.utils.uow import UnitOfWork


class UserService:
    uow: UnitOfWork

    def __init__(self, uow: UnitOfWork):
        self.uow = uow

    def update_user(self, dto: UserUpdateSchema, user_id: int) -> User:
        update_data = dto.model_dump(exclude_unset=True)
        user = self.uow.user_repository.update_user(update_data=update_data, user_id=user_id)
        if not user:
            raise UserNotFoundException()
        updated_user = self.uow.user_repository.get_user_by_id(user_id=user_id)
        return updated_user
    
    def get_user_by_user_id(self, user_id: int) -> User:
        user = self.uow.user_repository.get_user_by_id(user_id=user_id)
        if not user:
            raise UserNotFoundException()
        return user
