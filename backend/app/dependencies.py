"""FastAPI dependencies re-exported from core and db modules."""

from app.db.session import get_db
from app.core.permissions import get_current_user, get_optional_user, require_roles, security

__all__ = ["get_db", "get_current_user", "get_optional_user", "require_roles", "security"]