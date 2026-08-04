from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime


class UserCreateRequest(BaseModel):
    email: EmailStr
    username: str
    password: str
    role: str = "analyst"


class UserResponse(BaseModel):
    id: str
    email: str
    username: str
    role: str
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


class UserUpdateRequest(BaseModel):
    email: Optional[EmailStr] = None
    is_active: Optional[bool] = None
    role: Optional[str] = None
