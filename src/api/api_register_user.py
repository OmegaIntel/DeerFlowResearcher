from fastapi import APIRouter, HTTPException, Form, Depends
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session
from passlib.context import CryptContext
from src.db_models.users import User as DbUser
from src.db.db_session import get_db

router = APIRouter(tags=["auth"])

# Password hashing setup
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)

# Pydantic schema for response
class UserOut(BaseModel):
    id: str
    email: str
    is_admin: bool

    class Config:
        from_attributes = True

@router.post("/api/register", response_model=UserOut)
async def register(
    email: EmailStr = Form(...),
    password: str = Form(...),
    db: Session = Depends(get_db),
):
    existing_user = db.query(DbUser).filter(DbUser.email == email).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")

    new_user = DbUser(
        email=email,
        password_hash=get_password_hash(password)
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    return UserOut(
        id=str(new_user.id),
        email=new_user.email,
        is_admin=new_user.is_master_admin
    )