"""ERI 계산 테스트. ERI computation tests."""

import datetime as dt
from pathlib import Path

import pytest

from marine_ops.core import (
    MarineDataPoint,
    MarineMeasurement,
    MarineTimeseries,
    MarineVariable,
    Position,
    TimeseriesMetadata,
    UnitEnum,
)
from marine_ops.eri import compute_eri_timeseries, load_rule_set


@pytest.fixture
def eri_rules():
    """ERI 규칙 픽스처. ERI rules fixture."""
    fixture_path = Path(__file__).parent / "fixtures" / "eri_rules.yaml"
    return load_rule_set(fixture_path)


@pytest.fixture
def sample_timeseries():
    """샘플 시계열 픽스처. Sample timeseries fixture."""
    position = Position(latitude=25.0, longitude=55.0)
    metadata = TimeseriesMetadata(
        source="test",
        units={
            MarineVariable.SIGNIFICANT_WAVE_HEIGHT: UnitEnum.METERS,
            MarineVariable.WIND_SPEED_10M: UnitEnum.METERS_PER_SECOND,
            MarineVariable.VISIBILITY: UnitEnum.KILOMETERS,
        },
    )
    
    points = []
    for i in range(3):
        measurements = [
            MarineMeasurement(
                variable=MarineVariable.SIGNIFICANT_WAVE_HEIGHT,
                value=0.5 + i * 0.5,  # 0.5, 1.0, 1.5
                unit=UnitEnum.METERS,
            ),
            MarineMeasurement(
                variable=MarineVariable.WIND_SPEED_10M,
                value=5.0 + i * 5.0,  # 5.0, 10.0, 15.0
                unit=UnitEnum.METERS_PER_SECOND,
            ),
            MarineMeasurement(
                variable=MarineVariable.VISIBILITY,
                value=20.0 - i * 5.0,  # 20.0, 15.0, 10.0
                unit=UnitEnum.KILOMETERS,
            ),
        ]
        point = MarineDataPoint(
            timestamp=dt.datetime.now(tz=dt.timezone.utc) + dt.timedelta(hours=i),
            position=position,
            measurements=measurements,
            metadata=metadata,
        )
        points.append(point)
    
    return MarineTimeseries(points=points)


def test_load_rule_set(eri_rules):
    """규칙 세트 로드 테스트. Test rule set loading."""
    assert eri_rules.name == "Marine Operations ERI v0"
    assert eri_rules.version == "0.1.0"
    assert eri_rules.default_score == 50.0
    assert len(eri_rules.rules) > 0
    
    # 파고 규칙 확인 (Check wave height rules)
    wave_rules = [r for r in eri_rules.rules if r.variable == "wave_height"]
    assert len(wave_rules) > 0
    
    # 풍속 규칙 확인 (Check wind speed rules)
    wind_rules = [r for r in eri_rules.rules if r.variable == "wind_speed"]
    assert len(wind_rules) > 0


def test_rule_evaluation(eri_rules):
    """규칙 평가 테스트. Test rule evaluation."""
    # 이상적인 조건 (Ideal conditions)
    ideal_data = {
        "wave_height": 0.5,
        "wind_speed": 5.0,
        "visibility": 15.0,
    }
    ideal_score = eri_rules.evaluate_point(ideal_data)
    assert ideal_score >= 80.0  # 높은 점수 (High score)
    
    # 나쁜 조건 (Poor conditions)
    poor_data = {
        "wave_height": 4.0,
        "wind_speed": 35.0,
        "visibility": 1.0,
    }
    poor_score = eri_rules.evaluate_point(poor_data)
    assert poor_score < 40.0  # 낮은 점수 (Low score)
    
    # 중간 조건 (Moderate conditions)
    moderate_data = {
        "wave_height": 2.0,
        "wind_speed": 15.0,
        "visibility": 8.0,
    }
    moderate_score = eri_rules.evaluate_point(moderate_data)
    assert 40.0 <= moderate_score <= 80.0  # 중간 점수 (Moderate score)


def test_compute_eri_timeseries(sample_timeseries, eri_rules):
    """ERI 시계열 계산 테스트. Test ERI timeseries computation."""
    eri_points = compute_eri_timeseries(sample_timeseries, eri_rules)
    
    assert len(eri_points) == 3
    
    # 첫 번째 포인트 검증 (Validate first point)
    first_point = eri_points[0]
    assert "timestamp" in first_point
    assert "latitude" in first_point
    assert "longitude" in first_point
    assert "eri_score" in first_point
    assert "wave_height" in first_point
    assert "wind_speed" in first_point
    assert "visibility" in first_point
    
    # ERI 점수 범위 확인 (Check ERI score range)
    for point in eri_points:
        assert 0.0 <= point["eri_score"] <= 100.0
    
    # 첫 번째 포인트는 이상적인 조건이므로 높은 점수 (First point has ideal conditions, so high score)
    assert eri_points[0]["eri_score"] >= 80.0
    
    # 마지막 포인트는 더 나쁜 조건이므로 낮은 점수 (Last point has worse conditions, so lower score)
    assert eri_points[-1]["eri_score"] < eri_points[0]["eri_score"]


def test_eri_with_missing_data(sample_timeseries, eri_rules):
    """누락된 데이터로 ERI 계산 테스트. Test ERI computation with missing data."""
    # 일부 측정값 제거 (Remove some measurements)
    modified_points = []
    for point in sample_timeseries.points:
        # 가시거리 측정값 제거 (Remove visibility measurement)
        filtered_measurements = [
            m for m in point.measurements 
            if m.variable != MarineVariable.VISIBILITY
        ]
        modified_point = MarineDataPoint(
            timestamp=point.timestamp,
            position=point.position,
            measurements=filtered_measurements,
            metadata=point.metadata,
        )
        modified_points.append(modified_point)
    
    modified_timeseries = MarineTimeseries(points=modified_points)
    eri_points = compute_eri_timeseries(modified_timeseries, eri_rules)
    
    # 여전히 ERI 점수가 계산되어야 함 (ERI score should still be computed)
    assert len(eri_points) == 3
    for point in eri_points:
        assert 0.0 <= point["eri_score"] <= 100.0
        assert "visibility" not in point  # 가시거리 데이터는 없어야 함 (No visibility data)
