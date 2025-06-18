from fastapi import APIRouter, HTTPException, Depends, status
from pydantic import BaseModel, EmailStr
from typing import Optional, Annotated
from sqlalchemy.orm import Session
from passlib.context import CryptContext
import logging

from src.db_models.users import User as DbUser
from src.db.db_session import get_db
from src.api.api_get_current_user import get_current_user, User

logger = logging.getLogger(__name__)
router = APIRouter()

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    email: Optional[EmailStr] = None

class PasswordChange(BaseModel):
    current_password: str
    new_password: str

class UserResponse(BaseModel):
    id: str
    email: str
    full_name: Optional[str] = None
    is_admin: bool
    created_at: Optional[str] = None
    oauth_provider: Optional[str] = None

    class Config:
        from_attributes = True

@router.patch("/users/me")
async def update_user_profile(
    user_update: UserUpdate,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Session = Depends(get_db)
):
    """Update the current user's profile information."""
    try:
        # Get the user from database
        db_user = db.query(DbUser).filter(DbUser.id == current_user.id).first()
        if not db_user:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Update fields if provided
        if user_update.full_name is not None:
            db_user.full_name = user_update.full_name
        
        if user_update.email is not None:
            # Check if email is already taken by another user
            existing_user = db.query(DbUser).filter(
                DbUser.email == user_update.email,
                DbUser.id != current_user.id
            ).first()
            if existing_user:
                raise HTTPException(
                    status_code=400,
                    detail="Email already registered"
                )
            db_user.email = user_update.email
        
        db.commit()
        db.refresh(db_user)
        
        return UserResponse(
            id=str(db_user.id),
            email=db_user.email,
            full_name=db_user.full_name,
            is_admin=db_user.is_master_admin,
            created_at=db_user.created_at.isoformat() if db_user.created_at else None,
            oauth_provider=db_user.oauth_provider
        )
    except Exception as e:
        logger.error(f"Error updating user profile: {str(e)}")
        db.rollback()
        raise HTTPException(status_code=500, detail="Failed to update profile")

@router.post("/users/change-password")
async def change_password(
    password_data: PasswordChange,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Session = Depends(get_db)
):
    """Change the current user's password."""
    try:
        # Get the user from database
        db_user = db.query(DbUser).filter(DbUser.id == current_user.id).first()
        if not db_user:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Check if user logged in with OAuth
        if db_user.oauth_provider:
            raise HTTPException(
                status_code=400,
                detail="Cannot change password for OAuth users"
            )
        
        # Verify current password
        if not pwd_context.verify(password_data.current_password, db_user.password_hash):
            raise HTTPException(
                status_code=400,
                detail="Current password is incorrect"
            )
        
        # Update password
        db_user.password_hash = pwd_context.hash(password_data.new_password)
        db.commit()
        
        return {"message": "Password changed successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error changing password: {str(e)}")
        db.rollback()
        raise HTTPException(status_code=500, detail="Failed to change password")

@router.delete("/users/me")
async def delete_user_account(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Session = Depends(get_db)
):
    """Delete the current user's account."""
    try:
        # Get the user from database
        db_user = db.query(DbUser).filter(DbUser.id == current_user.id).first()
        if not db_user:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Delete the user
        db.delete(db_user)
        db.commit()
        
        return {"message": "Account deleted successfully"}
    except Exception as e:
        logger.error(f"Error deleting user account: {str(e)}")
        db.rollback()
        raise HTTPException(status_code=500, detail="Failed to delete account")

@router.get("/users/me/detailed")
async def get_user_detailed(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Session = Depends(get_db)
):
    """Get detailed information about the current user."""
    try:
        db_user = db.query(DbUser).filter(DbUser.id == current_user.id).first()
        if not db_user:
            raise HTTPException(status_code=404, detail="User not found")
        
        return UserResponse(
            id=str(db_user.id),
            email=db_user.email,
            full_name=db_user.full_name,
            is_admin=db_user.is_master_admin,
            created_at=db_user.created_at.isoformat() if db_user.created_at else None,
            oauth_provider=db_user.oauth_provider
        )
    except Exception as e:
        logger.error(f"Error getting user details: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to get user details")