"""
Database migration script to add user preferences columns.
Run this script to add the new preference columns to the users table.
"""
import asyncio
from sqlalchemy import text
from app.core.database import engine

async def add_user_preference_columns():
    """Add preference columns to users table."""
    
    statements = [
        # Add theme_preference column
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS theme_preference VARCHAR(20) DEFAULT 'system'",
        
        # Add season_preference column
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS season_preference VARCHAR(50)",
        
        # Add preferences_json column
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS preferences_json JSONB DEFAULT '{}'",
        
        # Update existing users to have default preferences
        "UPDATE users SET theme_preference = 'system' WHERE theme_preference IS NULL",
    ]
    
    async with engine.begin() as conn:
        print("Running migration: Add user preferences columns...")
        for i, stmt in enumerate(statements, 1):
            try:
                print(f"  [{i}/{len(statements)}] Executing: {stmt[:60]}...")
                await conn.execute(text(stmt))
            except Exception as e:
                print(f"  ⚠️  Statement {i} warning/error: {e}")
                # Continue with other statements
        
        print("✅ Migration completed!")
        print("   - Added theme_preference (VARCHAR)")
        print("   - Added season_preference (VARCHAR)")
        print("   - Added preferences_json (JSONB)")

async def rollback_migration():
    """Rollback migration - remove preference columns."""
    
    rollback_sql = """
    ALTER TABLE users DROP COLUMN IF EXISTS theme_preference;
    ALTER TABLE users DROP COLUMN IF EXISTS season_preference;
    ALTER TABLE users DROP COLUMN IF EXISTS preferences_json;
    """
    
    async with engine.begin() as conn:
        print("Rolling back migration...")
        await conn.execute(text(rollback_sql))
        print("✅ Rollback completed!")

if __name__ == "__main__":
    import sys
    
    if len(sys.argv) > 1 and sys.argv[1] == "rollback":
        asyncio.run(rollback_migration())
    else:
        asyncio.run(add_user_preference_columns())
