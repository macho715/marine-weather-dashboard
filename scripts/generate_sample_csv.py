"""샘플 CSV 생성 스크립트. Sample CSV generation script."""

import csv
import datetime as dt
from pathlib import Path

from marine_ops.core import (
    MarineDataPoint,
    MarineMeasurement,
    MarineTimeseries,
    MarineVariable,
    Position,
    TimeseriesMetadata,
    UnitEnum,
)


def generate_sample_timeseries_csv(output_path: Path) -> None:
    """샘플 시계열 CSV 생성. Generate sample timeseries CSV."""
    # 샘플 데이터 생성 (Generate sample data)
    position = Position(latitude=25.0, longitude=55.0)
    metadata = TimeseriesMetadata(
        source="sample",
        units={
            MarineVariable.SIGNIFICANT_WAVE_HEIGHT: UnitEnum.METERS,
            MarineVariable.WIND_SPEED_10M: UnitEnum.METERS_PER_SECOND,
            MarineVariable.WIND_DIRECTION_10M: UnitEnum.DEGREES,
            MarineVariable.VISIBILITY: UnitEnum.KILOMETERS,
            MarineVariable.SWELL_HEIGHT: UnitEnum.METERS,
            MarineVariable.SWELL_PERIOD: UnitEnum.SECONDS,
            MarineVariable.SWELL_DIRECTION: UnitEnum.DEGREES,
            MarineVariable.TIDE_HEIGHT: UnitEnum.METERS,
        },
    )
    
    points = []
    base_time = dt.datetime.now(tz=dt.timezone.utc).replace(
        hour=0, minute=0, second=0, microsecond=0
    )
    
    for i in range(24):  # 24시간 데이터
        timestamp = base_time + dt.timedelta(hours=i)
        
        # 시간에 따른 변화하는 값들 (Values that change over time)
        wave_height = 0.5 + 0.3 * (i % 8)  # 0.5-2.6m
        wind_speed = 5.0 + 2.0 * (i % 6)  # 5-15 m/s
        wind_direction = (180 + i * 15) % 360  # 180-195 degrees
        visibility = 20.0 - 0.5 * i  # 20-8 km
        swell_height = 0.3 + 0.2 * (i % 5)  # 0.3-1.1m
        swell_period = 6.0 + 1.0 * (i % 4)  # 6-9 seconds
        swell_direction = (200 + i * 10) % 360  # 200-219 degrees
        tide_height = 1.0 + 0.5 * (i % 12)  # 1.0-6.0m (12시간 주기)
        
        measurements = [
            MarineMeasurement(
                variable=MarineVariable.SIGNIFICANT_WAVE_HEIGHT,
                value=wave_height,
                unit=UnitEnum.METERS,
            ),
            MarineMeasurement(
                variable=MarineVariable.WIND_SPEED_10M,
                value=wind_speed,
                unit=UnitEnum.METERS_PER_SECOND,
            ),
            MarineMeasurement(
                variable=MarineVariable.WIND_DIRECTION_10M,
                value=wind_direction,
                unit=UnitEnum.DEGREES,
            ),
            MarineMeasurement(
                variable=MarineVariable.VISIBILITY,
                value=visibility,
                unit=UnitEnum.KILOMETERS,
            ),
            MarineMeasurement(
                variable=MarineVariable.SWELL_HEIGHT,
                value=swell_height,
                unit=UnitEnum.METERS,
            ),
            MarineMeasurement(
                variable=MarineVariable.SWELL_PERIOD,
                value=swell_period,
                unit=UnitEnum.SECONDS,
            ),
            MarineMeasurement(
                variable=MarineVariable.SWELL_DIRECTION,
                value=swell_direction,
                unit=UnitEnum.DEGREES,
            ),
            MarineMeasurement(
                variable=MarineVariable.TIDE_HEIGHT,
                value=tide_height,
                unit=UnitEnum.METERS,
            ),
        ]
        
        point = MarineDataPoint(
            timestamp=timestamp,
            position=position,
            measurements=measurements,
            metadata=metadata,
        )
        points.append(point)
    
    timeseries = MarineTimeseries(points=points)
    
    # CSV 파일 생성 (Generate CSV file)
    with open(output_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        
        # 헤더 작성 (Write header)
        writer.writerow([
            "timestamp",
            "latitude",
            "longitude",
            "variable",
            "value",
            "unit",
            "source",
            "quality_flag",
            "bias_corrected",
            "ensemble_weight",
        ])
        
        # 데이터 행 작성 (Write data rows)
        for row in timeseries.iter_rows():
            writer.writerow(row)
    
    print(f"샘플 시계열 CSV 생성 완료: {output_path}")


def generate_sample_jobs_csv(output_path: Path) -> None:
    """샘플 작업 CSV 생성. Generate sample jobs CSV."""
    jobs = [
        {
            "job_id": "JOB001",
            "vessel_name": "MV Ocean Explorer",
            "route": "Dubai to Abu Dhabi",
            "distance_nm": 120.0,
            "planned_speed_kt": 15.0,
            "etd": "2024-01-01T06:00:00Z",
            "eta": "2024-01-01T14:00:00Z",
            "cargo_type": "Container",
            "priority": "High",
            "weather_risk": "Low",
        },
        {
            "job_id": "JOB002",
            "vessel_name": "MV Sea Breeze",
            "route": "Abu Dhabi to Doha",
            "distance_nm": 250.0,
            "planned_speed_kt": 18.0,
            "etd": "2024-01-01T12:00:00Z",
            "eta": "2024-01-02T02:00:00Z",
            "cargo_type": "Bulk",
            "priority": "Medium",
            "weather_risk": "Medium",
        },
        {
            "job_id": "JOB003",
            "vessel_name": "MV Gulf Runner",
            "route": "Doha to Kuwait",
            "distance_nm": 180.0,
            "planned_speed_kt": 20.0,
            "etd": "2024-01-01T18:00:00Z",
            "eta": "2024-01-02T03:00:00Z",
            "cargo_type": "Liquid",
            "priority": "Low",
            "weather_risk": "High",
        },
    ]
    
    with open(output_path, "w", newline="", encoding="utf-8") as f:
        if jobs:
            writer = csv.DictWriter(f, fieldnames=jobs[0].keys())
            writer.writeheader()
            writer.writerows(jobs)
    
    print(f"샘플 작업 CSV 생성 완료: {output_path}")


def main():
    """메인 함수. Main function."""
    # 출력 디렉토리 생성 (Create output directory)
    output_dir = Path(".")
    output_dir.mkdir(exist_ok=True)
    
    # 샘플 파일들 생성 (Generate sample files)
    generate_sample_timeseries_csv(output_dir / "sample_timeseries.csv")
    generate_sample_jobs_csv(output_dir / "sample_jobs.csv")
    
    print("모든 샘플 CSV 파일 생성 완료!")


if __name__ == "__main__":
    main()
