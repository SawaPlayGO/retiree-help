from fastapi import APIRouter, Depends, HTTPException, status

from src.backend.schemas.auth import AccessTokenSchema, LoginSchema, RegisterSchema
from src.backend.services.auth_service import AuthService
from src.backend.utils.exceptions import (
    EmailAlreadyExists,
    NotValidRoleException,
    PasswordNotInvalidException,
    UserNotFoundException,
    UsernameAlreadyExists,
)
from src.backend.utils.uow import UnitOfWork, get_uow


router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=AccessTokenSchema, status_code=201)
def register_user(dto: RegisterSchema, uow: UnitOfWork = Depends(get_uow)):
    """
    Register a new user (`executor` or `customer`)\n
    Permission: All
    """
    try:
        response = AuthService(uow=uow).create_user(dto=dto)
        return response
    except NotValidRoleException as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid role provided"
        ) from e
    except EmailAlreadyExists as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User with this email already exists",
        ) from e
    except UsernameAlreadyExists as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User with this username already exists",
        ) from e


@router.post("/login", response_model=AccessTokenSchema, status_code=200)
def login_user(dto: LoginSchema, uow: UnitOfWork = Depends(get_uow)):
    """
    Login an existing user (`executor` or `customer` or `admin`)\n
    Permission: All
    """
    try:
        response = AuthService(uow=uow).login_user(dto=dto)
        return response
    except NotValidRoleException as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid role provided"
        ) from e
    except PasswordNotInvalidException as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials"
        ) from e
    except UserNotFoundException as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="User not found"
        ) from e
