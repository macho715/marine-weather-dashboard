"""WorldTides API 커넥터. WorldTides API connector."""

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


class WorldTidesConnector:
    """WorldTides API 커넥터. WorldTides API connector."""

    def __init__(self, api_key: str, base_url: str = "https://www.worldtides.info/api/v3"):
        """WorldTides 커넥터 초기화. Initialize WorldTides connector.
        
        Args:
            api_key: WorldTides API 키. WorldTides API key
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
        """조석 예보 데이터 가져오기. Fetch tide forecast data.
        
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
            "lon": longitude,
            "start": int(start.timestamp()),
            "end": int(end.timestamp()),
            "key": self.api_key,
        }
        
        with httpx.Client() as client:
            response = client.get(
                f"{self.base_url}/heights",
                params=params,
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
        
        for height_data in data.get("heights", []):
            timestamp = dt.datetime.fromtimestamp(
                height_data["dt"], tz=dt.timezone.utc
            )
            
            tide_height = height_data["height"]
            
            measurements = [
                MarineMeasurement(
                    variable=MarineVariable.TIDE_HEIGHT,
                    value=tide_height,
                    unit=UnitEnum.METERS,
                )
            ]
            
            metadata = TimeseriesMetadata(
                source="worldtides",
                units={MarineVariable.TIDE_HEIGHT: UnitEnum.METERS},
            )
            
            point = MarineDataPoint(
                timestamp=timestamp,
                position=position,
                measurements=measurements,
                metadata=metadata,
            )
            points.append(point)
        
        return MarineTimeseries(points=points)
