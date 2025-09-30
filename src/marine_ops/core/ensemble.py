"""해양 데이터 앙상블. Marine data ensemble."""

from __future__ import annotations

from typing import Sequence

from .schema import MarineDataPoint, MarineMeasurement, MarineTimeseries


def compute_weighted_ensemble(
    timeseries_list: Sequence[MarineTimeseries],
    weights: Sequence[float] | None = None,
) -> MarineTimeseries:
    """가중 앙상블 계산. Compute weighted ensemble.
    
    Args:
        timeseries_list: 시계열 리스트. List of timeseries
        weights: 가중치 리스트. List of weights
        
    Returns:
        가중 앙상블 시계열. Weighted ensemble timeseries
    """
    if not timeseries_list:
        raise ValueError("At least one timeseries is required")
    
    if len(timeseries_list) == 1:
        return timeseries_list[0]
    
    # 가중치 설정 (Set weights)
    if weights is None:
        weights = [1.0 / len(timeseries_list)] * len(timeseries_list)
    
    if len(weights) != len(timeseries_list):
        raise ValueError("Number of weights must match number of timeseries")
    
    # 가중치 정규화 (Normalize weights)
    total_weight = sum(weights)
    normalized_weights = [w / total_weight for w in weights]
    
    # 첫 번째 시계열을 기준으로 포인트별 앙상블 계산 (Use first timeseries as base for point-wise ensemble)
    base_timeseries = timeseries_list[0]
    ensemble_points = []
    
    for i, base_point in enumerate(base_timeseries.points):
        # 동일 시간대의 모든 포인트 수집 (Collect all points at same time)
        matching_points = []
        for j, ts in enumerate(timeseries_list):
            if i < len(ts.points):
                matching_points.append((ts.points[i], normalized_weights[j]))
        
        if not matching_points:
            continue
        
        # 앙상블 포인트 계산 (Compute ensemble point)
        ensemble_point = _compute_ensemble_point(matching_points)
        ensemble_points.append(ensemble_point)
    
    return MarineTimeseries(points=ensemble_points)


def _compute_ensemble_point(
    weighted_points: Sequence[tuple[MarineDataPoint, float]]
) -> MarineDataPoint:
    """포인트별 앙상블 계산. Compute ensemble for a single point."""
    if not weighted_points:
        raise ValueError("At least one weighted point is required")
    
    if len(weighted_points) == 1:
        return weighted_points[0][0]
    
    # 첫 번째 포인트를 기준으로 설정 (Use first point as base)
    base_point, base_weight = weighted_points[0]
    
    # 변수별 가중 평균 계산 (Compute weighted average for each variable)
    variable_weights = {}
    variable_values = {}
    variable_units = {}
    
    for point, weight in weighted_points:
        for measurement in point.measurements:
            var = measurement.variable
            if var not in variable_weights:
                variable_weights[var] = 0.0
                variable_values[var] = 0.0
                variable_units[var] = measurement.unit
            
            variable_weights[var] += weight
            variable_values[var] += measurement.value * weight
    
    # 앙상블 측정값 생성 (Create ensemble measurements)
    ensemble_measurements = []
    for var, total_weight in variable_weights.items():
        if total_weight > 0:
            ensemble_value = variable_values[var] / total_weight
            ensemble_measurement = MarineMeasurement(
                variable=var,
                value=ensemble_value,
                unit=variable_units[var],
                quality_flag="raw"  # 앙상블 결과는 raw로 표시 (Mark ensemble as raw)
            )
            ensemble_measurements.append(ensemble_measurement)
    
    # 메타데이터 업데이트 (Update metadata)
    updated_metadata = base_point.metadata.model_copy()
    updated_metadata.ensemble_weight = sum(w for _, w in weighted_points)
    
    return MarineDataPoint(
        timestamp=base_point.timestamp,
        position=base_point.position,
        measurements=ensemble_measurements,
        metadata=updated_metadata
    )
