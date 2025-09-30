"""ERI 계산. ERI computation."""

from __future__ import annotations

from typing import Dict, List

from .rules import ERIRuleSet
from ..core.schema import MarineDataPoint, MarineTimeseries, MarineVariable


def compute_eri_timeseries(
    timeseries: MarineTimeseries, rule_set: ERIRuleSet
) -> List[Dict[str, float]]:
    """시계열에 대한 ERI 계산. Compute ERI for timeseries.
    
    Args:
        timeseries: 해양 시계열. Marine timeseries
        rule_set: ERI 규칙 세트. ERI rule set
        
    Returns:
        ERI 점수 리스트. List of ERI scores
    """
    eri_points = []
    
    for point in timeseries.points:
        # 변수별 값 추출 (Extract variable values)
        data = {}
        for measurement in point.measurements:
            if measurement.variable == MarineVariable.SIGNIFICANT_WAVE_HEIGHT:
                data["wave_height"] = measurement.value
            elif measurement.variable == MarineVariable.WIND_SPEED_10M:
                data["wind_speed"] = measurement.value
            elif measurement.variable == MarineVariable.VISIBILITY:
                data["visibility"] = measurement.value
            elif measurement.variable == MarineVariable.SWELL_HEIGHT:
                data["swell_height"] = measurement.value
            elif measurement.variable == MarineVariable.TIDE_HEIGHT:
                data["tide_height"] = measurement.value
        
        # ERI 점수 계산 (Compute ERI score)
        eri_score = rule_set.evaluate_point(data)
        
        eri_point = {
            "timestamp": point.timestamp.isoformat(),
            "latitude": point.position.latitude,
            "longitude": point.position.longitude,
            "eri_score": round(eri_score, 2),
            **data,  # 원본 변수 값들 포함 (Include original variable values)
        }
        
        eri_points.append(eri_point)
    
    return eri_points
