"""Schemas for object-storage uploads."""

from pydantic import BaseModel


class UploadOut(BaseModel):
    """Public URL of a stored image."""

    url: str
