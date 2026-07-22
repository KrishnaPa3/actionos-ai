"""
Profile request/response schemas.
"""

from typing import Optional

from pydantic import BaseModel, Field


class ProfileUpdate(BaseModel):
    username: Optional[str] = Field(None, min_length=1, max_length=50)
    full_name: Optional[str] = Field(None, max_length=100)


class ProfileEmailUpdate(BaseModel):
    email: str = Field(..., min_length=3)


class ProfilePasswordUpdate(BaseModel):
    password: str = Field(..., min_length=6)


class ProfileResponse(BaseModel):
    id: str
    username: Optional[str] = None
    full_name: Optional[str] = None
    avatar_url: Optional[str] = None
    email: Optional[str] = None
    created_at: Optional[str] = None
    last_sign_in: Optional[str] = None
    provider: Optional[str] = None


class ProfileSetupResponse(BaseModel):
    success: bool
    message: str
    profile: Optional[ProfileResponse] = None

