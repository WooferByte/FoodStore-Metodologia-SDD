"""
ConfiguracionRepository — extends BaseRepository[Configuracion].

Provides access to system configuration key-value store.
"""

from core.models import Configuracion
from infrastructure.repositories.base_repository import BaseRepository


class ConfiguracionRepository(BaseRepository[Configuracion]):
    """
    Configuracion-specific repository.

    Inherits all generic CRUD operations from BaseRepository[Configuracion].
    """

    def __init__(self, session) -> None:
        super().__init__(session, Configuracion)
