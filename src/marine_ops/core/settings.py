"""해양 운항 설정. Marine operations settings."""

from __future__ import annotations

import os
from typing import TYPE_CHECKING

from pydantic import Field
from pydantic_settings import BaseSettings

if TYPE_CHECKING:
    from .connectors import OpenMeteoFallback, StormglassConnector, WorldTidesConnector


class MarineOpsSettings(BaseSettings):
    """해양 운항 설정. Marine operations settings."""

    stormglass_api_key: str = Field(..., description="Stormglass API key")
    worldtides_api_key: str = Field(..., description="WorldTides API key")
    open_meteo_base: str = Field(
        default="https://marine-api.open-meteo.com/v1/marine",
        description="Open-Meteo base URL"
    )
    open_meteo_timeout: float = Field(default=30.0, description="Open-Meteo timeout in seconds")
    app_log_level: str = Field(default="INFO", description="Application log level")
    tz: str = Field(default="Asia/Dubai", description="Timezone")

    class Config:
        """Pydantic 설정. Pydantic configuration."""

        env_file = ".env"
        env_file_encoding = "utf-8"

    @classmethod
    def from_env(cls) -> "MarineOpsSettings":
        """환경변수에서 설정 로드. Load settings from environment variables."""
        return cls()

    def build_stormglass_connector(self) -> "StormglassConnector":
        """Stormglass 커넥터 생성. Build Stormglass connector."""
        from ..connectors import StormglassConnector
        return StormglassConnector(api_key=self.stormglass_api_key)

    def build_worldtides_connector(self) -> "WorldTidesConnector":
        """WorldTides 커넥터 생성. Build WorldTides connector."""
        from ..connectors import WorldTidesConnector
        return WorldTidesConnector(api_key=self.worldtides_api_key)

    def build_open_meteo_fallback(self) -> "OpenMeteoFallback":
        """Open-Meteo 폴백 커넥터 생성. Build Open-Meteo fallback connector."""
        from ..connectors import OpenMeteoFallback
        return OpenMeteoFallback(
            base_url=self.open_meteo_base,
            timeout=self.open_meteo_timeout
        )
