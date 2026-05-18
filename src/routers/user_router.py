from fastapi import APIRouter, Depends, HTTPException, UploadFile, status

from src.schemas.auth import TokenPayloadSchema
from src.schemas.user import UserUpdateSchema, GetUserSchema
from src.services.auth_service import AuthService
from src.services.user_service import UserService
from src.utils.enums import Role
from src.utils.exceptions import UserNotFoundException
from src.utils.uow import UnitOfWork, get_uow

router = APIRouter(prefix="/user", tags=["users"])


@router.put("/", response_model=GetUserSchema, status_code=status.HTTP_200_OK)
def update_user(
    dto: UserUpdateSchema,
    payload: TokenPayloadSchema = Depends(AuthService.verify_jwt),
    uow: UnitOfWork = Depends(get_uow),
):
    """
    Update user profile information.

    Parameters:
    - name: User's display name (optional)
    - description: User's profile description/bio (optional)
    - photo: Profile photo file (optional, PNG/JPG)

    Returns:
    - Updated profile information
    """
    try:
        user_id = payload.user_id
        user = UserService(uow=uow).update_user(dto=dto, user_id=user_id)
    except UserNotFoundException as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="User not found"
        ) from e
    return user


@router.get("/me", status_code=status.HTTP_200_OK, response_model=GetUserSchema)
def get_user_me(
    payload: TokenPayloadSchema = Depends(
        AuthService.require_roles(Role.EXECUTOR, Role.CUSTOMER, Role.ADMIN)
    ),
    uow: UnitOfWork = Depends(get_uow),
):
    """
    Get user information by user_id.

    Permission: Executor, Customer, Admin

    Returns:
    - User information
    """
    try:
        user = UserService(uow=uow).get_user_by_user_id(user_id=payload.user_id)
    except UserNotFoundException as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="User not found"
        ) from e
    return user


@router.get("/{user_id}", status_code=status.HTTP_200_OK)
def get_user(
    user_id: int,
    payload: TokenPayloadSchema = Depends(
        AuthService.require_roles(Role.EXECUTOR, Role.CUSTOMER, Role.ADMIN)
    ),
    uow: UnitOfWork = Depends(get_uow),
):
    """
    Get user information by user_id.

    Parameters:
    - user_id: The ID of the user

    Permission: Executor, Customer, Admin

    Returns:
    - User information
    """
    try:
        user = UserService(uow=uow).get_user_by_user_id(user_id=user_id)
    except UserNotFoundException as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="User not found"
        ) from e
    return user
