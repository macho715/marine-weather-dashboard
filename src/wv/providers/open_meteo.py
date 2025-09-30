"""오픈 메테오 해양 공급자. Open-Meteo marine provider."""

from __future__ import annotations

import datetime as dt
import os
from typing import List

import httpx

from wv.core.models import ForecastPoint
from wv.providers.base import (
    MarineProvider,
    ProviderError,
    ProviderRateLimitError,
    ProviderTimeoutError,
)


class OpenMeteoMarineProvider(MarineProvider):
    """오픈 메테오 API 래퍼. Wrapper for Open-Meteo API."""

    name = "open-meteo-marine"

    def __init__(
        self,
        endpoint: str | None = None,
        client: httpx.Client | None = None,
        timeout: float | None = None,
    ) -> None:
        self._endpoint = (
            endpoint
            or os.getenv("WV_OPEN_METEO_ENDPOINT", "https://marine-api.open-meteo.com/v1/marine")
            or "https://marine-api.open-meteo.com/v1/marine"
        )
        self._client = client or httpx.Client(timeout=timeout or self.timeout)
        self._owns_client = client is None
        if timeout is not None and client is not None:
            self.timeout = timeout

    def __del__(self) -> None:
        if getattr(self, "_owns_client", False):
            self._client.close()

    def fetch(self, lat: float, lon: float, hours: int) -> List[ForecastPoint]:
        """오픈 메테오 예보 획득. Fetch Open-Meteo forecast."""

        params = {
            "latitude": f"{lat:.4f}",
            "longitude": f"{lon:.4f}",
            "hourly": "wave_height,wave_direction,wave_period,wind_speed,wind_direction",
            "past_hours": 0,
            "forecast_hours": max(hours, 1),
        }
        try:
            response = self._client.get(self._endpoint, params=params, timeout=self.timeout)
        except httpx.TimeoutException as exc:
            raise ProviderTimeoutError("Open-Meteo request timed out") from exc
        except httpx.HTTPError as exc:  # pragma: no cover - network failure path
            raise ProviderError(f"Open-Meteo request failed: {exc}") from exc

        if response.status_code == 429:
            raise ProviderRateLimitError("Open-Meteo rate limit exceeded")
        if response.status_code >= 500:
            raise ProviderError(f"Open-Meteo server error {response.status_code}")
        if response.status_code != 200:
            raise ProviderError(f"Open-Meteo unexpected status {response.status_code}")

        payload = response.json()
        hourly = payload.get("hourly")
        if not isinstance(hourly, dict):
            raise ProviderError("Open-Meteo payload missing hourly data")

        times = list(hourly.get("time", []))
        if not times:
            raise ProviderError("Open-Meteo returned no timestamps")

        def value(key_primary: str, key_fallback: str, index: int) -> float | None:
            raw = hourly.get(key_primary)
            if not raw:
                raw = hourly.get(key_fallback)
            try:
                candidate = raw[index]  # type: ignore[index]
            except (IndexError, TypeError):
                return None
            try:
                return float(candidate)
            except (TypeError, ValueError):
                return None

        points: List[ForecastPoint] = []
        for idx, raw_time in enumerate(times):
            try:
                timestamp = dt.datetime.fromisoformat(str(raw_time).replace("Z", "+00:00"))
            except ValueError:
                continue
            if timestamp.tzinfo is None:
                timestamp = timestamp.replace(tzinfo=dt.timezone.utc)
            points.append(
                ForecastPoint(
                    time=timestamp,
                    lat=lat,
                    lon=lon,
                    hs=value("wave_height", "swell_wave_height", idx) or 0.0,
                    tp=value("wave_period", "swell_wave_period", idx) or 0.0,
                    dp=value("wave_direction", "swell_wave_direction", idx) or 0.0,
                    wind_speed=value("wind_speed", "wind_speed_10m", idx) or 0.0,
                    wind_dir=value("wind_direction", "wind_direction_10m", idx) or 0.0,
                    swell_height=value("swell_wave_height", "wave_height", idx) or 0.0,
                    swell_period=value("swell_wave_period", "wave_period", idx) or 0.0,
                    swell_direction=value("swell_wave_direction", "wave_direction", idx) or 0.0,
                )
            )

        if not points:
            raise ProviderError("Open-Meteo returned no data")
        return points


__all__ = ["OpenMeteoMarineProvider"]
