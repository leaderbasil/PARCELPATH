"""Database session configuration: SQLAlchemy 2.x sync with psycopg 3."""

from collections.abc import Generator

from sqlalchemy import create_engine, event, text
from sqlalchemy.orm import Session, sessionmaker

from app.core.config import settings

engine = create_engine(
    settings.DATABASE_URL,
    pool_pre_ping=True,
    pool_size=10,
    max_overflow=20,
)


@event.listens_for(engine, "connect")
def set_statement_timeout(dbapi_connection, connection_record) -> None:  # noqa: ANN001
    """Bound runaway queries without changing the application's isolation level."""
    cursor = dbapi_connection.cursor()
    try:
        cursor.execute(
            "SET statement_timeout = %s" % settings.DB_STATEMENT_TIMEOUT_MS
        )
    finally:
        cursor.close()


SessionLocal = sessionmaker(
    bind=engine,
    autocommit=False,
    autoflush=False,
    expire_on_commit=False,
    class_=Session,
)


def get_db() -> Generator[Session, None, None]:
    """Yield a database session per request, closing it afterwards."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def check_database_connection() -> bool:
    """Return True when the database answers a trivial query."""
    try:
        with engine.connect() as connection:
            connection.execute(text("SELECT 1"))
        return True
    except Exception:
        return False
