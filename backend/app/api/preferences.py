"""
User preferences API endpoints.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.core.security import get_current_user_id
from app.models.models import User
from app.schemas.user import UserPreferences, UserPreferencesUpdate

router = APIRouter(prefix="/users", tags=["User Preferences"])


@router.get("/me/preferences", response_model=UserPreferences)
async def get_user_preferences(
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    """Get current user's preferences."""
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    return UserPreferences(
        theme=user.theme_preference,
        season=user.season_preference
    )


@router.put("/me/preferences", response_model=UserPreferences)
async def update_user_preferences(
    preferences: UserPreferencesUpdate,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    """Update current user's preferences."""
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Update preferences
    if preferences.theme is not None:
        user.theme_preference = preferences.theme
    if preferences.season is not None:
        user.season_preference = preferences.season
    
    await db.commit()
    await db.refresh(user)
    
    return UserPreferences(
        theme=user.theme_preference,
        season=user.season_preference
    )
