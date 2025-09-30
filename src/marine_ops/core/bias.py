"""해양 데이터 편향 보정. Marine data bias correction."""

from __future__ import annotations

import statistics
from typing import Sequence

from .schema import MarineDataPoint, MarineMeasurement, MarineVariable


def correct_bias(
    points: Sequence[MarineDataPoint],
    reference_points: Sequence[MarineDataPoint],
    variable: MarineVariable,
) -> Sequence[MarineDataPoint]:
    """편향 보정 적용. Apply bias correction.
    
    Args:
        points: 보정할 데이터 포인트들. Data points to correct
        reference_points: 참조 데이터 포인트들. Reference data points
        variable: 대상 변수. Target variable
        
    Returns:
        편향 보정된 데이터 포인트들. Bias corrected data points
    """
    if not points or not reference_points:
        return points
    
    # 참조 데이터에서 변수별 값 추출 (Extract values from reference data)
    ref_values = []
    for point in reference_points:
        for measurement in point.measurements:
            if measurement.variable == variable:
                ref_values.append(measurement.value)
    
    if not ref_values:
        return points
    
    # 참조 통계 계산 (Calculate reference statistics)
    ref_mean = statistics.mean(ref_values)
    ref_std = statistics.stdev(ref_values) if len(ref_values) > 1 else 0.0
    
    # 보정할 데이터에서 변수별 값 추출 (Extract values from data to correct)
    data_values = []
    for point in points:
        for measurement in point.measurements:
            if measurement.variable == variable:
                data_values.append(measurement.value)
    
    if not data_values:
        return points
    
    # 데이터 통계 계산 (Calculate data statistics)
    data_mean = statistics.mean(data_values)
    data_std = statistics.stdev(data_values) if len(data_values) > 1 else 0.0
    
    # 편향 보정 계수 계산 (Calculate bias correction factors)
    if data_std > 0:
        scale_factor = ref_std / data_std
    else:
        scale_factor = 1.0
    
    bias_offset = ref_mean - (data_mean * scale_factor)
    
    # 보정 적용 (Apply correction)
    result_points = []
    for point in points:
        corrected_measurements = []
        for measurement in point.measurements:
            if measurement.variable == variable:
                corrected_value = measurement.value * scale_factor + bias_offset
                corrected_measurement = MarineMeasurement(
                    variable=measurement.variable,
                    value=corrected_value,
                    unit=measurement.unit,
                    quality_flag=measurement.quality_flag
                )
                corrected_measurements.append(corrected_measurement)
            else:
                corrected_measurements.append(measurement)
        
        # 메타데이터 업데이트 (Update metadata)
        updated_metadata = point.metadata.model_copy()
        updated_metadata.bias_corrected = True
        
        result_point = MarineDataPoint(
            timestamp=point.timestamp,
            position=point.position,
            measurements=corrected_measurements,
            metadata=updated_metadata
        )
        result_points.append(result_point)
    
    return result_points
