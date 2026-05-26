"""
Pydantic v2 request/response schemas for configuration endpoints.

Validates valor is not blank (strips whitespace before length check).
"""
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field, field_validator


class ConfigUpdateRequest(BaseModel):
    """Schema for updating a configuration value."""

    valor: str = Field(min_length=1, max_length=1000)

    @field_validator("valor", mode="before")
    @classmethod
    def strip_valor(cls, v: object) -> object:
        """
        Strip whitespace from valor.
        Ensures whitespace-only values fail the min_length=1 check.
        """
        if isinstance(v, str):
            return v.strip() if v else v
        return v


class ConfiguracionResponse(BaseModel):
    """Public configuration representation."""

    id: int
    clave: str
    valor: str
    descripcion: Optional[str]
    actualizado_por: int
    actualizado_en: datetime
    creado_en: datetime

    model_config = {"from_attributes": True}
