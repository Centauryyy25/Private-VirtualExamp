"""
Migration: Add total_questions and correct_answers columns to exam_sessions table.

Usage:
    python migrate_session_columns.py          # Apply migration
    python migrate_session_columns.py rollback  # Rollback migration
"""
import asyncio
import sys
import asyncpg

DATABASE_URL = "postgresql://postgres:password@localhost:5432/virtualexamp"


async def migrate():
    conn = await asyncpg.connect(DATABASE_URL)
    try:
        # Check if columns already exist
        cols = await conn.fetch(
            "SELECT column_name FROM information_schema.columns "
            "WHERE table_name = 'exam_sessions' AND column_name IN ('total_questions', 'correct_answers')"
        )
        existing = {r["column_name"] for r in cols}

        if "total_questions" not in existing:
            await conn.execute("ALTER TABLE exam_sessions ADD COLUMN total_questions INTEGER")
            print("Added column: total_questions")
        else:
            print("Column total_questions already exists, skipping.")

        if "correct_answers" not in existing:
            await conn.execute("ALTER TABLE exam_sessions ADD COLUMN correct_answers INTEGER")
            print("Added column: correct_answers")
        else:
            print("Column correct_answers already exists, skipping.")

        print("Migration complete.")
    finally:
        await conn.close()


async def rollback():
    conn = await asyncpg.connect(DATABASE_URL)
    try:
        await conn.execute("ALTER TABLE exam_sessions DROP COLUMN IF EXISTS total_questions")
        await conn.execute("ALTER TABLE exam_sessions DROP COLUMN IF EXISTS correct_answers")
        print("Rollback complete: removed total_questions and correct_answers columns.")
    finally:
        await conn.close()


if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "rollback":
        asyncio.run(rollback())
    else:
        asyncio.run(migrate())
