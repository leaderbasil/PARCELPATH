"""Application settings loaded from environment variables."""

from decimal import Decimal
from pathlib import Path

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

BACKEND_DIR = Path(__file__).resolve().parents[2]


class Settings(BaseSettings):
    """Application configuration with startup validation."""

    APP_ENV: str = "development"
    APP_NAME: str = "Mini E-Commerce Tracking"
    API_V1_PREFIX: str = "/api/v1"

    DATABASE_URL: str = "postgresql+psycopg://postgres:password@localhost:5432/mini_ecommerce"
    TEST_DATABASE_URL: str = (
        "postgresql+psycopg://postgres:password@localhost:5432/mini_ecommerce_test"
    )

    JWT_SECRET_KEY: str = "replace-with-a-long-random-secret"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30

    FRONTEND_ORIGIN: str = "http://localhost:5173"

    SHIPPING_FEE: Decimal = Decimal("0.00")
    CURRENCY_CODE: str = "USD"
    REPORT_TIMEZONE: str = "UTC"

    FIRST_ADMIN_EMAIL: str = "admin@example.com"
    FIRST_ADMIN_PASSWORD: str = "change-me-now"

    DB_STATEMENT_TIMEOUT_MS: int = 15000

    model_config = SettingsConfigDict(
        env_file=str(BACKEND_DIR / ".env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    @field_validator("REPORT_TIMEZONE")
    @classmethod
    def validate_timezone(cls, value: str) -> str:
        """Fail fast on an unknown reporting timezone."""
        from zoneinfo import ZoneInfo

        ZoneInfo(value)
        return value

    @field_validator("SHIPPING_FEE")
    @classmethod
    def validate_shipping_fee(cls, value: Decimal) -> Decimal:
        """Shipping fee must be non-negative and have at most two decimals."""
        if value < 0 or value.as_tuple().exponent < -2:
            raise ValueError("SHIPPING_FEE must be a non-negative amount with 2 decimals")
        return value

    def validate_production(self) -> None:
        """Validate production-specific security requirements."""
        if self.APP_ENV.lower() != "production":
            return
        if getattr(self, "_production_validated", False):
            return
        if self.JWT_SECRET_KEY == "replace-with-a-long-random-secret":
            raise ValueError("JWT_SECRET_KEY must be changed in production")
        if len(self.JWT_SECRET_KEY) < 32:
            raise ValueError("JWT_SECRET_KEY must be at least 32 characters in production")
        if self.FIRST_ADMIN_PASSWORD == "change-me-now":
            raise ValueError("FIRST_ADMIN_PASSWORD must be changed in production")
        object.__setattr__(self, "_production_validated", True)


settings = Settings()
settings.validate_production()
