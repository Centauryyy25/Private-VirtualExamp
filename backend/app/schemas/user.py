"""
User preference schemas for API validation.
"""
from typing import Optional
from pydantic import BaseModel, Field


class UserPreferences(BaseModel):
    """User preferences response model."""
    theme: str = Field(default="system", pattern="^(system|light|dark)$")
    season: Optional[str] = None
    
    class Config:
        from_attributes = True


class UserPreferencesUpdate(BaseModel):
    """User preferences update request model."""
    theme: Optional[str] = Field(None, pattern="^(system|light|dark)$")
    season: Optional[str] = None
    
    class Config:
        from_attributes = True
