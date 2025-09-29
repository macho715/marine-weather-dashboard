"""프로바이더 생성기. Provider factory."""

from __future__ import annotations

from typing import Sequence

from wv.providers.base import BaseProvider
from wv.providers.open_meteo import OpenMeteoMarineProvider
from wv.providers.sample import SampleProvider
from wv.utils.cache import DiskCache


def create_providers() -> Sequence[BaseProvider]:
    """기본 공급자 목록. Build default provider list."""

    providers: list[BaseProvider] = [
        OpenMeteoMarineProvider(),
    ]
    providers.append(SampleProvider())
    return providers


def create_manager() -> ProviderManager:
    """기본 매니저 생성. Create default manager."""

    cache = DiskCache()
    return ProviderManager(create_providers(), cache)


__all__ = ["create_manager", "create_providers"]
