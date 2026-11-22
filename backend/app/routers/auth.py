"""Authentication router: register, login, me."""

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.permissions import CurrentUser
from app.db.session import get_db
from app.schemas.auth import LoginIn, RegisterIn, TokenOut, UserOut
from app.schemas.common import Envelope
from app.services import auth_service

router = APIRouter(prefix="/auth", tags=["Auth"])


@router.post(
    "/register",
    status_code=status.HTTP_201_CREATED,
    response_model=Envelope[UserOut],
    summary="Register a new customer",
)
def register(payload: RegisterIn, db: Session = Depends(get_db)) -> dict:
    """Register a customer; a submitted role field is rejected by the schema."""
    user = auth_service.register_user(db, payload)
    return {
        "data": UserOut.model_validate(user),
        "message": "User registered successfully",
    }


@router.post("/login", response_model=Envelope[TokenOut], summary="Log in")
def login(payload: LoginIn, db: Session = Depends(get_db)) -> dict:
    """Authenticate and return an access token plus the user profile."""
    user = auth_service.authenticate(db, payload)
    return {
        "data": {
            "access_token": auth_service.create_token_for(user),
            "token_type": "bearer",
            "expires_in": settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
            "user": UserOut.model_validate(user),
        },
        "message": "Login successful",
    }


@router.get("/me", response_model=Envelope[UserOut], summary="Current user")
def get_me(current_user: CurrentUser) -> dict:
    """Return the authenticated user's profile."""
    return {"data": UserOut.model_validate(current_user), "message": "Current user"}
