import os

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession

from core.config import settings


DB_POOL_SIZE = int(os.getenv("DB_POOL_SIZE", "100"))
WEB_CONCURRENCY = int(os.getenv("WEB_CONCURRENCY", "4"))
POOL_SIZE = max(DB_POOL_SIZE // WEB_CONCURRENCY, 5)

engine = create_engine(settings.SQLALCHEMY_DATABASE_URI, pool_size=POOL_SIZE, max_overflow=0, pool_pre_ping=True)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


DB_URI = settings.SQLALCHEMY_DATABASE_URI.replace(
    "postgresql://", "postgresql+asyncpg://"
)
async_engine = create_async_engine(
    DB_URI,
    echo=False, 
    pool_size=POOL_SIZE,
    max_overflow=0,
    pool_pre_ping=True
)
async_session = sessionmaker(autocommit=False, autoflush=False, bind=async_engine, class_=AsyncSession, expire_on_commit=False)
