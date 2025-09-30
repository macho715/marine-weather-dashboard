"""Open-Meteo Marine API 폴백 커넥터. Open-Meteo Marine API fallback connector."""

from __future__ import annotations

import datetime as dt
from typing import TYPE_CHECKING, Sequence

import httpx

from ..core.schema import (
    MarineDataPoint,
    MarineMeasurement,
    MarineTimeseries,
    MarineVariable,
    Position,
    TimeseriesMetadata,
    UnitEnum,
)

if TYPE_CHECKING:
    from .stormglass import StormglassConnector

FALLBACK_STATUS_CODES = (429, 500, 502, 503, 504)


class OpenMeteoFallback:
    """Open-Meteo Marine API 폴백 커넥터. Open-Meteo Marine API fallback connector."""

    def __init__(self, base_url: str, timeout: float = 30.0):
        """Open-Meteo 폴백 커넥터 초기화. Initialize Open-Meteo fallback connector.
        
        Args:
            base_url: 기본 URL. Base URL
            timeout: 타임아웃. Timeout
        """
        self.base_url = base_url
        self.timeout = timeout

    def fetch_forecast(
        self,
        latitude: float,
        longitude: float,
        start: dt.datetime,
        end: dt.datetime,
    ) -> MarineTimeseries:
        """예보 데이터 가져오기. Fetch forecast data.
        
        Args:
            latitude: 위도. Latitude
            longitude: 경도. Longitude
            start: 시작 시간. Start time
            end: 종료 시간. End time
            
        Returns:
            해양 시계열 데이터. Marine timeseries data
        """
        params = {
            "latitude": latitude,
            "longitude": longitude,
            "start_date": start.date().isoformat(),
            "end_date": end.date().isoformat(),
            "hourly": "wave_height,wind_speed_10m,wind_direction_10m,visibility,swell_wave_height,swell_wave_period,swell_wave_direction",
        }
        
        with httpx.Client() as client:
            response = client.get(
                f"{self.base_url}/forecast",
                params=params,
                timeout=self.timeout,
            )
            response.raise_for_status()
            data = response.json()
        
        return self._parse_response(data, latitude, longitude)

    def _parse_response(
        self, data: dict, latitude: float, longitude: float
    ) -> MarineTimeseries:
        """응답 파싱. Parse response."""
        points = []
        position = Position(latitude=latitude, longitude=longitude)
        
        hourly = data.get("hourly", {})
        times = hourly.get("time", [])
        
        for i, time_str in enumerate(times):
            timestamp = dt.datetime.fromisoformat(time_str.replace("Z", "+00:00"))
            
            measurements = []
            
            # 파고 (Wave height)
            if "wave_height" in hourly and i < len(hourly["wave_height"]):
                wave_height = hourly["wave_height"][i]
                if wave_height is not None:
                    measurements.append(
                        MarineMeasurement(
                            variable=MarineVariable.SIGNIFICANT_WAVE_HEIGHT,
                            value=wave_height,
                            unit=UnitEnum.METERS,
                        )
                    )
            
            # 풍속 (Wind speed)
            if "wind_speed_10m" in hourly and i < len(hourly["wind_speed_10m"]):
                wind_speed = hourly["wind_speed_10m"][i]
                if wind_speed is not None:
                    measurements.append(
                        MarineMeasurement(
                            variable=MarineVariable.WIND_SPEED_10M,
                            value=wind_speed,
                            unit=UnitEnum.METERS_PER_SECOND,
                        )
                    )
            
            # 풍향 (Wind direction)
            if "wind_direction_10m" in hourly and i < len(hourly["wind_direction_10m"]):
                wind_dir = hourly["wind_direction_10m"][i]
                if wind_dir is not None:
                    measurements.append(
                        MarineMeasurement(
                            variable=MarineVariable.WIND_DIRECTION_10M,
                            value=wind_dir,
                            unit=UnitEnum.DEGREES,
                        )
                    )
            
            # 가시거리 (Visibility)
            if "visibility" in hourly and i < len(hourly["visibility"]):
                visibility = hourly["visibility"][i]
                if visibility is not None:
                    measurements.append(
                        MarineMeasurement(
                            variable=MarineVariable.VISIBILITY,
                            value=visibility,
                            unit=UnitEnum.KILOMETERS,
                        )
                    )
            
            # 너울 높이 (Swell height)
            if "swell_wave_height" in hourly and i < len(hourly["swell_wave_height"]):
                swell_height = hourly["swell_wave_height"][i]
                if swell_height is not None:
                    measurements.append(
                        MarineMeasurement(
                            variable=MarineVariable.SWELL_HEIGHT,
                            value=swell_height,
                            unit=UnitEnum.METERS,
                        )
                    )
            
            # 너울 주기 (Swell period)
            if "swell_wave_period" in hourly and i < len(hourly["swell_wave_period"]):
                swell_period = hourly["swell_wave_period"][i]
                if swell_period is not None:
                    measurements.append(
                        MarineMeasurement(
                            variable=MarineVariable.SWELL_PERIOD,
                            value=swell_period,
                            unit=UnitEnum.SECONDS,
                        )
                    )
            
            # 너울 방향 (Swell direction)
            if "swell_wave_direction" in hourly and i < len(hourly["swell_wave_direction"]):
                swell_dir = hourly["swell_wave_direction"][i]
                if swell_dir is not None:
                    measurements.append(
                        MarineMeasurement(
                            variable=MarineVariable.SWELL_DIRECTION,
                            value=swell_dir,
                            unit=UnitEnum.DEGREES,
                        )
                    )
            
            if measurements:
                metadata = TimeseriesMetadata(
                    source="open-meteo",
                    units={
                        MarineVariable.SIGNIFICANT_WAVE_HEIGHT: UnitEnum.METERS,
                        MarineVariable.WIND_SPEED_10M: UnitEnum.METERS_PER_SECOND,
                        MarineVariable.WIND_DIRECTION_10M: UnitEnum.DEGREES,
                        MarineVariable.VISIBILITY: UnitEnum.KILOMETERS,
                        MarineVariable.SWELL_HEIGHT: UnitEnum.METERS,
                        MarineVariable.SWELL_PERIOD: UnitEnum.SECONDS,
                        MarineVariable.SWELL_DIRECTION: UnitEnum.DEGREES,
                    },
                )
                
                point = MarineDataPoint(
                    timestamp=timestamp,
                    position=position,
                    measurements=measurements,
                    metadata=metadata,
                )
                points.append(point)
        
        return MarineTimeseries(points=points)


def fetch_forecast_with_fallback(
    latitude: float,
    longitude: float,
    start: dt.datetime,
    end: dt.datetime,
    primary: "StormglassConnector",
    fallback: "OpenMeteoFallback",
    retry_statuses: Sequence[int] = FALLBACK_STATUS_CODES,
) -> MarineTimeseries:
    """Stormglass 장애 시 폴백. Use Open-Meteo when Stormglass fails.
    
    Args:
        latitude: 위도. Latitude
        longitude: 경도. Longitude
        start: 시작 시간. Start time
        end: 종료 시간. End time
        primary: 주 커넥터. Primary connector
        fallback: 폴백 커넥터. Fallback connector
        retry_statuses: 재시도 상태 코드. Retry status codes
        
    Returns:
        해양 시계열 데이터. Marine timeseries data
    """
    try:
        return primary.fetch_forecast(latitude, longitude, start, end)
    except httpx.HTTPStatusError as exc:
        status = exc.response.status_code
        if status not in retry_statuses:
            raise
        print(f"Stormglass HTTP {status} triggered fallback: {exc.response.text}")
        return fallback.fetch_forecast(latitude, longitude, start, end)
    except (httpx.TimeoutException, httpx.RequestError) as exc:
        print(f"Stormglass request error triggered fallback: {exc}")
        return fallback.fetch_forecast(latitude, longitude, start, end)
