"""Stormglass API 커넥터. Stormglass API connector."""

from __future__ import annotations

import datetime as dt
from typing import Sequence

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
from ..core.units import convert_units


class StormglassConnector:
    """Stormglass API 커넥터. Stormglass API connector."""

    def __init__(self, api_key: str, base_url: str = "https://api.stormglass.io/v2"):
        """Stormglass 커넥터 초기화. Initialize Stormglass connector.
        
        Args:
            api_key: Stormglass API 키. Stormglass API key
            base_url: 기본 URL. Base URL
        """
        self.api_key = api_key
        self.base_url = base_url

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
            "lat": latitude,
            "lng": longitude,
            "start": start.isoformat(),
            "end": end.isoformat(),
            "params": "waveHeight,windSpeed,windDirection,visibility,swellHeight,swellPeriod,swellDirection",
        }
        
        headers = {"Authorization": self.api_key}
        
        with httpx.Client() as client:
            response = client.get(
                f"{self.base_url}/weather/point",
                params=params,
                headers=headers,
                timeout=30.0,
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
        
        for hour_data in data.get("hours", []):
            timestamp = dt.datetime.fromisoformat(hour_data["time"].replace("Z", "+00:00"))
            
            measurements = []
            
            # 파고 (Wave height)
            if "waveHeight" in hour_data:
                wave_height = hour_data["waveHeight"]["noaa"]
                measurements.append(
                    MarineMeasurement(
                        variable=MarineVariable.SIGNIFICANT_WAVE_HEIGHT,
                        value=wave_height,
                        unit=UnitEnum.METERS,
                    )
                )
            
            # 풍속 (Wind speed)
            if "windSpeed" in hour_data:
                wind_speed = hour_data["windSpeed"]["noaa"]
                measurements.append(
                    MarineMeasurement(
                        variable=MarineVariable.WIND_SPEED_10M,
                        value=wind_speed,
                        unit=UnitEnum.METERS_PER_SECOND,
                    )
                )
            
            # 풍향 (Wind direction)
            if "windDirection" in hour_data:
                wind_dir = hour_data["windDirection"]["noaa"]
                measurements.append(
                    MarineMeasurement(
                        variable=MarineVariable.WIND_DIRECTION_10M,
                        value=wind_dir,
                        unit=UnitEnum.DEGREES,
                    )
                )
            
            # 가시거리 (Visibility)
            if "visibility" in hour_data:
                visibility = hour_data["visibility"]["noaa"]
                measurements.append(
                    MarineMeasurement(
                        variable=MarineVariable.VISIBILITY,
                        value=visibility,
                        unit=UnitEnum.KILOMETERS,
                    )
                )
            
            # 너울 높이 (Swell height)
            if "swellHeight" in hour_data:
                swell_height = hour_data["swellHeight"]["noaa"]
                measurements.append(
                    MarineMeasurement(
                        variable=MarineVariable.SWELL_HEIGHT,
                        value=swell_height,
                        unit=UnitEnum.METERS,
                    )
                )
            
            # 너울 주기 (Swell period)
            if "swellPeriod" in hour_data:
                swell_period = hour_data["swellPeriod"]["noaa"]
                measurements.append(
                    MarineMeasurement(
                        variable=MarineVariable.SWELL_PERIOD,
                        value=swell_period,
                        unit=UnitEnum.SECONDS,
                    )
                )
            
            # 너울 방향 (Swell direction)
            if "swellDirection" in hour_data:
                swell_dir = hour_data["swellDirection"]["noaa"]
                measurements.append(
                    MarineMeasurement(
                        variable=MarineVariable.SWELL_DIRECTION,
                        value=swell_dir,
                        unit=UnitEnum.DEGREES,
                    )
                )
            
            if measurements:
                metadata = TimeseriesMetadata(
                    source="stormglass",
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
