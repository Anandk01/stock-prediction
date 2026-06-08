import aiosqlite
import os
import json
from core.config import settings

DB_PATH = os.path.join(os.getcwd(), "data", "app.db")
os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)

async def init_db():
    """Initialize SQLite database and create tables."""
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                email TEXT UNIQUE NOT NULL,
                hashed_password TEXT NOT NULL,
                full_name TEXT,
                created_at TEXT NOT NULL,
                is_active INTEGER DEFAULT 1
            )
        """)
        await db.execute("""
            CREATE TABLE IF NOT EXISTS portfolios (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id TEXT UNIQUE NOT NULL,
                holdings TEXT NOT NULL DEFAULT '[]',
                metrics TEXT,
                allocation TEXT,
                ai_strategy TEXT,
                created_at TEXT NOT NULL
            )
        """)
        await db.execute("""
            CREATE TABLE IF NOT EXISTS parsed_portfolios (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id TEXT UNIQUE NOT NULL,
                holdings TEXT NOT NULL DEFAULT '[]',
                cas_total REAL DEFAULT 0.0,
                extracted_total REAL DEFAULT 0.0,
                confidence REAL DEFAULT 0.0,
                format_type TEXT DEFAULT 'UNKNOWN',
                status TEXT DEFAULT 'parsed',
                created_at TEXT NOT NULL
            )
        """)
        await db.commit()


def get_db_path() -> str:
    return DB_PATH
