"""프로바이더 추상화. Provider abstractions."""

from __future__ import annotations

import abc
import logging
from typing import Iterable, Sequence

from wv.core.models import ForecastPoint, ForecastSeries

LOGGER = logging.getLogger(__name__)


class ProviderError(RuntimeError):
    """데이터 공급 오류. Data provider error."""


class ProviderTimeoutError(ProviderError):
    """요청 시간초과. Request timed out."""


class ProviderRateLimitError(ProviderError):
    """요청 제한 초과. Rate limit exceeded."""


class BaseProvider(abc.ABC):
    """기상 데이터 공급 베이스. Base weather data provider."""

    timeout: float = 10.0
    max_retries: int = 3
    backoff_factor: float = 1.5

    @property
    @abc.abstractmethod
    def name(self) -> str:
        """공급자 이름. Provider name."""

    @abc.abstractmethod
    def fetch_forecast(self, lat: float, lon: float, hours: int) -> ForecastSeries:
        """예보 조회 수행. Retrieve forecast payload."""

    def __call__(self, lat: float, lon: float, hours: int) -> Iterable[ForecastPoint]:
        """호출 시 예보 반환. Return forecast when called."""

        LOGGER.debug("Provider %s called for %s,%s h=%s", self.name, lat, lon, hours)
        try:
            return self.fetch_forecast(lat, lon, hours)
        except ProviderError:
            raise
        except Exception as exc:  # noqa: BLE001
            raise ProviderError(f"Provider {self.name} failed: {exc}") from exc


class MarineProvider(BaseProvider, abc.ABC):
    """해양 전용 공급자. Marine-specific provider."""

    @abc.abstractmethod
    def fetch(self, lat: float, lon: float, hours: int) -> Sequence[ForecastPoint]:
        """예보 데이터 획득. Fetch marine forecast data."""

    def fetch_forecast(self, lat: float, lon: float, hours: int) -> ForecastSeries:
        """해양 fetch 위임. Delegate to marine fetch."""

        return self.fetch(lat=lat, lon=lon, hours=hours)


__all__ = [
    "BaseProvider",
    "MarineProvider",
    "ProviderError",
    "ProviderRateLimitError",
    "ProviderTimeoutError",
]
