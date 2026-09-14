from datetime import datetime, timedelta, timezone

import bcrypt
import jwt
from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel

from database import create_user, get_user_by_email, update_user_token

router = APIRouter()

SECRET_KEY = "acp-secret-jwt-key"
ALGORITHM = "HS256"
TOKEN_EXPIRE_HOURS = 24


class LoginRequest(BaseModel):
    email: str
    password: str


class LoginResponse(BaseModel):
    email: str
    token: str


class RegisterRequest(BaseModel):
    email: str
    password: str


class RegisterResponse(BaseModel):
    email: str
    token: str
    message: str


def create_jwt_token(email: str) -> str:
    expire = datetime.now(timezone.utc) + timedelta(hours=TOKEN_EXPIRE_HOURS)
    payload = {"sub": email, "exp": expire}
    token = jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)
    # PyJWT returns a str on recent versions, bytes on older ones.
    if isinstance(token, bytes):
        token = token.decode("utf-8")
    return token


@router.post("/login", response_model=LoginResponse)
async def login(payload: LoginRequest):
    user = await get_user_by_email(payload.email)

    if user is None or not bcrypt.checkpw(
        payload.password.encode("utf-8"), user["password"].encode("utf-8")
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    token = create_jwt_token(payload.email)
    await update_user_token(payload.email, token)

    return LoginResponse(email=payload.email, token=token)


@router.post(
    "/register", response_model=RegisterResponse, status_code=status.HTTP_201_CREATED
)
async def register(payload: RegisterRequest):
    if len(payload.password) < 4:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must be at least 4 characters",
        )

    existing_user = await get_user_by_email(payload.email)
    if existing_user is not None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered",
        )

    password_hash = bcrypt.hashpw(payload.password.encode("utf-8"), bcrypt.gensalt())
    await create_user(payload.email, password_hash)

    token = create_jwt_token(payload.email)
    await update_user_token(payload.email, token)

    return RegisterResponse(
        email=payload.email,
        token=token,
        message="User registered successfully",
    )
