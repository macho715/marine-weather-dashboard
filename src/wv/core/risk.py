"""위험 평가 로직을 제공. | Provide risk assessment logic."""

from __future__ import annotations

import os
from typing import List

from .models import ForecastPoint, RiskAssessment, RiskLevel, RiskMetrics


def _env_float(name: str, default: float) -> float:
    """환경 변수에서 부동 소수 값을 읽음. | Read float from environment variable."""
    value = os.getenv(name)
    if value is None:
        return default
    try:
        return float(value)
    except ValueError:
        return default


def compute_risk(point: ForecastPoint) -> RiskAssessment:
    """예측 지점의 위험을 계산. | Compute risk for forecast point."""
    medium_hs = _env_float("WV_MEDIUM_HS", 2.0)
    high_hs = _env_float("WV_HIGH_HS", 3.0)
    medium_wind = _env_float("WV_MEDIUM_WIND", 22.0)
    high_wind = _env_float("WV_HIGH_WIND", 28.0)

    level = RiskLevel.LOW
    reasons: List[str] = []

    hs = point.hs or point.swell_height
    if hs is not None:
        if hs > high_hs:
            level = RiskLevel.HIGH
            reasons.append(
                f"Significant wave height {hs:.2f} m exceeds high threshold {high_hs:.2f} m"
            )
        elif hs > medium_hs and level != RiskLevel.HIGH:
            level = RiskLevel.MEDIUM
            reasons.append(
                f"Significant wave height {hs:.2f} m exceeds medium threshold {medium_hs:.2f} m"
            )

    wind = point.wind_speed
    if wind is not None:
        if wind > high_wind:
            level = RiskLevel.HIGH
            reasons.append(f"Wind speed {wind:.2f} kt exceeds high threshold {high_wind:.2f} kt")
        elif wind > medium_wind and level != RiskLevel.HIGH:
            level = RiskLevel.MEDIUM
            reasons.append(
                f"Wind speed {wind:.2f} kt exceeds medium threshold {medium_wind:.2f} kt"
            )

    if point.swell_period is None or point.swell_direction is None:
        level = RiskLevel.MEDIUM if level is RiskLevel.LOW else level
        reasons.append("Missing swell inputs; conservative risk applied")

    metrics = RiskMetrics(
        max_wave_height=float(hs) if hs is not None else 0.0,
        max_wind_speed=float(wind) if wind is not None else 0.0,
        dominant_wave_dir=point.dp,
        dominant_wind_dir=point.wind_dir,
        average_swell_period=point.swell_period,
    )

    if not reasons:
        reasons.append("Conditions within defined safety thresholds")

    return RiskAssessment(level=level, reasons=reasons, metrics=metrics)