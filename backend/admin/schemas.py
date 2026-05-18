"""
Pydantic v2 schemas for admin user management endpoints.

Schemas:
- AdminUsuarioResponse: Public-safe user representation with roles list
- AdminListUsuariosResponse: Paginated list wrapper with total/limit/offset
- AdminUpdateUsuarioRequest: Optional fields for updating user data and roles
- AdminToggleEstadoRequest: Toggle user active/inactive status
"""
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, EmailStr, Field, field_validator

from core.sanitize import sanitize_text


class AdminUsuarioResponse(BaseModel):
    """Public-safe user representation for admin panel — includes roles as name list."""

    id: int
    email: str
    nombre: str
    apellido: Optional[str]
    activo: bool
    telefono: Optional[str]
    creado_en: datetime
    roles: list[str]  # List of role names, e.g. ["ADMIN", "STOCK"]

    model_config = {"from_attributes": True}


class AdminListUsuariosResponse(BaseModel):
    """Paginated response wrapper for the admin users list endpoint."""

    items: list[AdminUsuarioResponse]
    total: int
    limit: int
    offset: int


class AdminUpdateUsuarioRequest(BaseModel):
    """
    Request schema for updating a user's data and/or roles (admin only).

    All fields are optional. If `roles` is provided it must not be empty.
    """

    nombre: Optional[str] = Field(default=None, min_length=1, max_length=100)
    apellido: Optional[str] = Field(default=None, max_length=100)
    email: Optional[EmailStr] = None
    telefono: Optional[str] = Field(default=None, max_length=30)
    roles: Optional[list[str]] = None  # List of role names to assign (replaces current roles)

    @field_validator("nombre", "apellido", mode="before")
    @classmethod
    def sanitize_text_fields(cls, v: object) -> object:
        """Strip HTML tags from free-text name fields."""
        if isinstance(v, str):
            return sanitize_text(v)
        return v

    @field_validator("roles", mode="before")
    @classmethod
    def roles_not_empty(cls, v: object) -> object:
        """Roles list, if provided, must contain at least one element."""
        if v is not None and isinstance(v, list) and len(v) == 0:
            raise ValueError("roles list must not be empty if provided")
        return v


class AdminToggleEstadoRequest(BaseModel):
    """Request schema for toggling user active/inactive state (admin only)."""

    activo: bool
