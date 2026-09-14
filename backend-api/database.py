import os

import bcrypt
from databases import Database

POSTGRES_USER = os.getenv("POSTGRES_USER", "temp")
POSTGRES_PASSWORD = os.getenv("POSTGRES_PASSWORD", "temp")
POSTGRES_DB = os.getenv("POSTGRES_DB", "advcompro")
POSTGRES_HOST = os.getenv("POSTGRES_HOST", "db")

DATABASE_URL = (
    f"postgresql+asyncpg://{POSTGRES_USER}:{POSTGRES_PASSWORD}"
    f"@{POSTGRES_HOST}/{POSTGRES_DB}"
)

database = Database(DATABASE_URL)


async def connect_db():
    await database.connect()


async def disconnect_db():
    await database.disconnect()


async def setup_db():
    await database.execute("""
        CREATE TABLE IF NOT EXISTS users (
            email VARCHAR(255) PRIMARY KEY,
            password TEXT NOT NULL,
            token TEXT,
            create_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
        """)

    demo_password = bcrypt.hashpw(b"password", bcrypt.gensalt()).decode("utf-8")
    await database.execute(
        """
        INSERT INTO users (email, password)
        VALUES (:email, :password)
        ON CONFLICT (email) DO NOTHING
        """,
        {"email": "demo@example.com", "password": demo_password},
    )


async def get_user_by_email(email: str):
    return await database.fetch_one(
        "SELECT email, password, token, create_at FROM users WHERE email = :email",
        {"email": email},
    )


async def update_user_token(email: str, token: str):
    await database.execute(
        "UPDATE users SET token = :token WHERE email = :email",
        {"email": email, "token": token},
    )


async def create_user(email: str, password_hash: str):
    """
    Insert a new user into the users table.
    `password_hash` should already be a bcrypt hash (str or bytes).
    """
    if isinstance(password_hash, bytes):
        password_hash = password_hash.decode("utf-8")

    await database.execute(
        """
        INSERT INTO users (email, password)
        VALUES (:email, :password)
        """,
        {"email": email, "password": password_hash},
    )
