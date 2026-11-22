"""Initialize the database with the first admin user (idempotent)."""

import logging
from uuid import uuid4

from sqlalchemy import func, select

from app.core.config import settings
from app.core.security import hash_password
from app.db.session import SessionLocal
from app.models.user import User, UserRole

logger = logging.getLogger(__name__)


def init_db() -> None:
    """Create the first admin only when no active admin exists."""
    db = SessionLocal()
    try:
        admin_count = db.scalar(
            select(func.count())
            .select_from(User)
            .where(User.role == UserRole.ADMIN, User.is_active.is_(True))
        )
        if admin_count:
            logger.info("Admin user already exists. Skipping initialization.")
            return

        admin = User(
            id=uuid4(),
            full_name="System Administrator",
            email=settings.FIRST_ADMIN_EMAIL.lower(),
            phone=None,
            password_hash=hash_password(settings.FIRST_ADMIN_PASSWORD),
            role=UserRole.ADMIN,
            is_active=True,
        )
        db.add(admin)
        db.commit()
        logger.info("First admin user created: %s", admin.email)
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    init_db()
