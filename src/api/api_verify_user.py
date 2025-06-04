from fastapi import APIRouter, Form, Depends
from pydantic import BaseModel
from typing import Optional
from fastapi.security import OAuth2PasswordBearer
import jwt
import os
from sqlalchemy.orm import Session
from src.db_models.users import User as DbUser
from typing import Annotated
from src.db.db_session import get_db

# Environment variables and constants
SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key")
ALGORITHM = "HS256"


# FastAPI OAuth2 scheme
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

# Initialize the router
verify_user_router = APIRouter()


class TokenData(BaseModel):
    email: Optional[str] = None


class User(BaseModel):
    id: str
    email: str
    is_admin: bool

    class Config:
        from_attributes = True


async def bypass_user(
    token: Annotated[str, Depends(oauth2_scheme)], db: Session = Depends(get_db)
) -> User:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            return None
        token_data = TokenData(email=email)
    except jwt.PyJWTError:
        return None

    user = db.query(DbUser).filter(DbUser.email == token_data.email).first()
    if user is None:
        return None

    return User(id=str(user.id), email=user.email, is_admin=user.is_master_admin)


# New route to verify if a token is expired or not
@verify_user_router.post("/api/token/verify")
async def verify_token(token: str = Form(...)):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        # If we reach here, token is valid and not expired
        return {"valid": True}
    except jwt.ExpiredSignatureError:
        # Token has expired
        return {"valid": False}
    except jwt.PyJWTError:
        # Token is invalid for other reasons
        return {"valid": False}
