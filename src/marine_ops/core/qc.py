"""해양 데이터 품질 관리. Marine data quality control."""

from __future__ import annotations

import statistics
from typing import Sequence

from .schema import MarineDataPoint, MarineMeasurement, MarineVariable


def apply_quality_control(
    points: Sequence[MarineDataPoint],
    variable: MarineVariable,
    min_value: float | None = None,
    max_value: float | None = None,
    iqr_multiplier: float = 1.5,
) -> Sequence[MarineDataPoint]:
    """품질 관리 적용. Apply quality control.
    
    Args:
        points: 데이터 포인트들. Data points
        variable: 대상 변수. Target variable
        min_value: 최소값. Minimum value
        max_value: 최대값. Maximum value
        iqr_multiplier: IQR 클리핑 배수. IQR clipping multiplier
        
    Returns:
        품질 관리된 데이터 포인트들. Quality controlled data points
    """
    if not points:
        return points
    
    # 변수별 값 추출 (Extract values for variable)
    values = []
    for point in points:
        for measurement in point.measurements:
            if measurement.variable == variable:
                values.append(measurement.value)
    
    if not values:
        return points
    
    # 물리적 한계 설정 (Set physical bounds)
    if min_value is None:
        min_value = _get_physical_min(variable)
    if max_value is None:
        max_value = _get_physical_max(variable)
    
    # IQR 클리핑 (IQR clipping)
    quantiles = statistics.quantiles(values, n=4)
    q1, q3 = quantiles[0], quantiles[2]
    iqr = q3 - q1
    lower_bound = q1 - iqr_multiplier * iqr
    upper_bound = q3 + iqr_multiplier * iqr
    
    # 최종 한계 (Final bounds)
    final_min = max(min_value, lower_bound)
    final_max = min(max_value, upper_bound)
    
    # 클리핑 적용 (Apply clipping)
    result_points = []
    for point in points:
        clipped_measurements = []
        for measurement in point.measurements:
            if measurement.variable == variable:
                clipped_value = max(final_min, min(final_max, measurement.value))
                clipped_measurement = MarineMeasurement(
                    variable=measurement.variable,
                    value=clipped_value,
                    unit=measurement.unit,
                    quality_flag="clipped" if clipped_value != measurement.value else measurement.quality_flag
                )
                clipped_measurements.append(clipped_measurement)
            else:
                clipped_measurements.append(measurement)
        
        result_point = MarineDataPoint(
            timestamp=point.timestamp,
            position=point.position,
            measurements=clipped_measurements,
            metadata=point.metadata
        )
        result_points.append(result_point)
    
    return result_points


def _get_physical_min(variable: MarineVariable) -> float:
    """변수별 물리적 최소값. Physical minimum for variable."""
    limits = {
        MarineVariable.SIGNIFICANT_WAVE_HEIGHT: 0.0,
        MarineVariable.WIND_SPEED_10M: 0.0,
        MarineVariable.WIND_DIRECTION_10M: 0.0,
        MarineVariable.VISIBILITY: 0.0,
        MarineVariable.SWELL_HEIGHT: 0.0,
        MarineVariable.SWELL_PERIOD: 0.0,
        MarineVariable.SWELL_DIRECTION: 0.0,
        MarineVariable.TIDE_HEIGHT: -10.0,  # 극한 저조 (Extreme low tide)
    }
    return limits.get(variable, 0.0)


def _get_physical_max(variable: MarineVariable) -> float:
    """변수별 물리적 최대값. Physical maximum for variable."""
    limits = {
        MarineVariable.SIGNIFICANT_WAVE_HEIGHT: 20.0,  # 극한 파고 (Extreme wave height)
        MarineVariable.WIND_SPEED_10M: 100.0,  # 극한 풍속 (Extreme wind speed)
        MarineVariable.WIND_DIRECTION_10M: 360.0,
        MarineVariable.VISIBILITY: 50.0,  # km
        MarineVariable.SWELL_HEIGHT: 15.0,  # 극한 너울 (Extreme swell)
        MarineVariable.SWELL_PERIOD: 30.0,  # 초 (seconds)
        MarineVariable.SWELL_DIRECTION: 360.0,
        MarineVariable.TIDE_HEIGHT: 10.0,  # 극한 고조 (Extreme high tide)
    }
    return limits.get(variable, 1000.0)
