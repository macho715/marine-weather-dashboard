"""핵심 모듈 테스트. Core modules tests."""

import datetime as dt
from decimal import Decimal

import pytest

from marine_ops.core import (
    MarineDataPoint,
    MarineMeasurement,
    MarineTimeseries,
    MarineVariable,
    Position,
    TimeseriesMetadata,
    UnitEnum,
    apply_quality_control,
    compute_weighted_ensemble,
    convert_units,
    correct_bias,
)
from marine_ops.core.settings import MarineOpsSettings


def test_convert_units():
    """단위 변환 테스트. Test unit conversion."""
    # 피트를 미터로 변환 (Convert feet to meters)
    assert abs(convert_units(1.0, "ft", "m") - 0.3048) < 1e-6
    
    # 미터를 피트로 변환 (Convert meters to feet)
    assert abs(convert_units(0.3048, "m", "ft") - 1.0) < 1e-6
    
    # 노트를 m/s로 변환 (Convert knots to m/s)
    assert abs(convert_units(1.0, "kt", "m/s") - 0.514444) < 1e-6
    
    # m/s를 노트로 변환 (Convert m/s to knots)
    assert abs(convert_units(0.514444, "m/s", "kt") - 1.0) < 1e-6


def test_apply_quality_control():
    """품질 관리 테스트. Test quality control."""
    # 테스트 데이터 생성 (Create test data)
    position = Position(latitude=25.0, longitude=55.0)
    metadata = TimeseriesMetadata(
        source="test",
        units={MarineVariable.SIGNIFICANT_WAVE_HEIGHT: UnitEnum.METERS},
    )
    
    points = []
    for i in range(5):
        measurements = [
            MarineMeasurement(
                variable=MarineVariable.SIGNIFICANT_WAVE_HEIGHT,
                value=float(i),  # 0, 1, 2, 3, 4
                unit=UnitEnum.METERS,
            )
        ]
        point = MarineDataPoint(
            timestamp=dt.datetime.now(tz=dt.timezone.utc) + dt.timedelta(hours=i),
            position=position,
            measurements=measurements,
            metadata=metadata,
        )
        points.append(point)
    
    timeseries = MarineTimeseries(points=points)
    
    # 품질 관리 적용 (Apply quality control)
    controlled_points = apply_quality_control(
        timeseries.points,
        MarineVariable.SIGNIFICANT_WAVE_HEIGHT,
        min_value=0.5,
        max_value=3.5,
    )
    
    # 결과 검증 (Validate results)
    assert len(controlled_points) == 5
    
    # 클리핑된 값들 확인 (Check clipped values)
    for point in controlled_points:
        for measurement in point.measurements:
            if measurement.variable == MarineVariable.SIGNIFICANT_WAVE_HEIGHT:
                assert 0.5 <= measurement.value <= 3.5


def test_correct_bias():
    """편향 보정 테스트. Test bias correction."""
    # 참조 데이터 (Reference data)
    ref_position = Position(latitude=25.0, longitude=55.0)
    ref_metadata = TimeseriesMetadata(
        source="reference",
        units={MarineVariable.SIGNIFICANT_WAVE_HEIGHT: UnitEnum.METERS},
    )
    
    ref_points = []
    for i in range(3):
        measurements = [
            MarineMeasurement(
                variable=MarineVariable.SIGNIFICANT_WAVE_HEIGHT,
                value=2.0 + i * 0.5,  # 2.0, 2.5, 3.0
                unit=UnitEnum.METERS,
            )
        ]
        point = MarineDataPoint(
            timestamp=dt.datetime.now(tz=dt.timezone.utc) + dt.timedelta(hours=i),
            position=ref_position,
            measurements=measurements,
            metadata=ref_metadata,
        )
        ref_points.append(point)
    
    # 보정할 데이터 (Data to correct)
    data_position = Position(latitude=25.0, longitude=55.0)
    data_metadata = TimeseriesMetadata(
        source="data",
        units={MarineVariable.SIGNIFICANT_WAVE_HEIGHT: UnitEnum.METERS},
    )
    
    data_points = []
    for i in range(3):
        measurements = [
            MarineMeasurement(
                variable=MarineVariable.SIGNIFICANT_WAVE_HEIGHT,
                value=1.0 + i * 0.25,  # 1.0, 1.25, 1.5 (더 낮은 값)
                unit=UnitEnum.METERS,
            )
        ]
        point = MarineDataPoint(
            timestamp=dt.datetime.now(tz=dt.timezone.utc) + dt.timedelta(hours=i),
            position=data_position,
            measurements=measurements,
            metadata=data_metadata,
        )
        data_points.append(point)
    
    # 편향 보정 적용 (Apply bias correction)
    corrected_points = correct_bias(
        data_points, ref_points, MarineVariable.SIGNIFICANT_WAVE_HEIGHT
    )
    
    # 결과 검증 (Validate results)
    assert len(corrected_points) == 3
    
    # 편향 보정이 적용되었는지 확인 (Check if bias correction was applied)
    for point in corrected_points:
        assert point.metadata.bias_corrected is True


def test_compute_weighted_ensemble():
    """가중 앙상블 테스트. Test weighted ensemble."""
    # 첫 번째 시계열 (First timeseries)
    position = Position(latitude=25.0, longitude=55.0)
    metadata1 = TimeseriesMetadata(
        source="source1",
        units={MarineVariable.SIGNIFICANT_WAVE_HEIGHT: UnitEnum.METERS},
    )
    
    points1 = []
    for i in range(2):
        measurements = [
            MarineMeasurement(
                variable=MarineVariable.SIGNIFICANT_WAVE_HEIGHT,
                value=1.0 + i * 0.5,  # 1.0, 1.5
                unit=UnitEnum.METERS,
            )
        ]
        point = MarineDataPoint(
            timestamp=dt.datetime.now(tz=dt.timezone.utc) + dt.timedelta(hours=i),
            position=position,
            measurements=measurements,
            metadata=metadata1,
        )
        points1.append(point)
    
    timeseries1 = MarineTimeseries(points=points1)
    
    # 두 번째 시계열 (Second timeseries)
    metadata2 = TimeseriesMetadata(
        source="source2",
        units={MarineVariable.SIGNIFICANT_WAVE_HEIGHT: UnitEnum.METERS},
    )
    
    points2 = []
    for i in range(2):
        measurements = [
            MarineMeasurement(
                variable=MarineVariable.SIGNIFICANT_WAVE_HEIGHT,
                value=2.0 + i * 0.5,  # 2.0, 2.5
                unit=UnitEnum.METERS,
            )
        ]
        point = MarineDataPoint(
            timestamp=dt.datetime.now(tz=dt.timezone.utc) + dt.timedelta(hours=i),
            position=position,
            measurements=measurements,
            metadata=metadata2,
        )
        points2.append(point)
    
    timeseries2 = MarineTimeseries(points=points2)
    
    # 가중 앙상블 계산 (Compute weighted ensemble)
    ensemble = compute_weighted_ensemble(
        [timeseries1, timeseries2], weights=[0.7, 0.3]
    )
    
    # 결과 검증 (Validate results)
    assert len(ensemble.points) == 2
    
    # 첫 번째 포인트의 가중 평균 확인 (Check weighted average of first point)
    first_point = ensemble.points[0]
    for measurement in first_point.measurements:
        if measurement.variable == MarineVariable.SIGNIFICANT_WAVE_HEIGHT:
            # 1.0 * 0.7 + 2.0 * 0.3 = 1.3
            expected = 1.0 * 0.7 + 2.0 * 0.3
            assert abs(measurement.value - expected) < 1e-6


def test_marine_ops_settings():
    """해양 운항 설정 테스트. Test marine operations settings."""
    # 환경변수 설정 (Set environment variables)
    import os
    os.environ["STORMGLASS_API_KEY"] = "test_stormglass_key"
    os.environ["WORLDTIDES_API_KEY"] = "test_worldtides_key"
    
    # 설정 로드 (Load settings)
    settings = MarineOpsSettings.from_env()
    
    # 검증 (Validate)
    assert settings.stormglass_api_key == "test_stormglass_key"
    assert settings.worldtides_api_key == "test_worldtides_key"
    assert settings.open_meteo_base == "https://marine-api.open-meteo.com/v1/marine"
    assert settings.open_meteo_timeout == 30.0
    assert settings.app_log_level == "INFO"
    assert settings.tz == "Asia/Dubai"
    
    # 커넥터 생성 테스트 (Test connector creation)
    stormglass = settings.build_stormglass_connector()
    assert stormglass.api_key == "test_stormglass_key"
    
    worldtides = settings.build_worldtides_connector()
    assert worldtides.api_key == "test_worldtides_key"
    
    open_meteo = settings.build_open_meteo_fallback()
    assert open_meteo.base_url == "https://marine-api.open-meteo.com/v1/marine"
    assert open_meteo.timeout == 30.0
