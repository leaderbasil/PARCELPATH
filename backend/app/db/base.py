"""Declarative base shared by models, sessions and Alembic."""

from sqlalchemy.orm import DeclarativeBase


class Base(DeclarativeBase):
    """Single declarative base for all four tables."""
