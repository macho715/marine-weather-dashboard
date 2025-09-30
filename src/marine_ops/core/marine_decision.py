"""해양 운항 의사결정 알고리즘. Marine operations decision algorithm."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Literal

from pydantic import BaseModel, Field

# 상수 정의
FT_TO_M = 0.3048
ALPHA = 0.85  # Combined → 등가 Hs 축소계수
BETA = 0.80   # ADNOC 스무딩 보정
K_WIND = 0.06  # 풍속 감속 계수
K_WAVE = 0.60  # 파고 감속 계수

# 경보 가중치
ALERT_GAMMA = {
    None: 0.0,
    "": 0.0,
    "rough at times westward": 0.15,
    "High seas": 0.30,
    "High Seas": 0.30,
    "Fog": 0.0,  # Fog는 게이트에서 직접 No-Go 처리
}

# 결정 게이트 임계값
GO_THRESHOLD_HS = 1.00  # m
GO_THRESHOLD_WIND = 20  # kt
CONDITIONAL_THRESHOLD_HS = 1.20  # m
CONDITIONAL_THRESHOLD_WIND = 22  # kt


class MarineInputs(BaseModel):
    """해양 운항 입력 데이터. Marine operations input data."""
    
    # ADNOC 데이터
    combined_ft: float = Field(..., description="ADNOC Combined 파고 (ft)")
    wind_adnoc: float = Field(..., description="ADNOC 풍속 (kt)")
    
    # Al Bahar 데이터
    hs_onshore_ft: float = Field(..., description="Al Bahar 연안 파고 (ft)")
    hs_offshore_ft: float = Field(..., description="Al Bahar 외해 파고 (ft)")
    wind_albahar: float = Field(..., description="Al Bahar 풍속 (kt)")
    alert: str | None = Field(None, description="Al Bahar 경보 메시지")
    
    # 항로 정보
    offshore_weight: float = Field(..., ge=0.0, le=1.0, description="외해 가중치 (0-1)")
    distance_nm: float = Field(..., gt=0, description="항로 거리 (NM)")
    planned_speed: float = Field(..., gt=0, description="계획 속력 (kn)")


class MarineOutput(BaseModel):
    """해양 운항 출력 데이터. Marine operations output data."""
    
    hs_fused_m: float = Field(..., description="융합된 유의파고 (m)")
    wind_fused_kt: float = Field(..., description="융합된 풍속 (kt)")
    decision: Literal["Go", "Conditional Go", "No-Go", "Conditional Go (coastal window)"] = Field(
        ..., description="운항 결정"
    )
    eta_hours: float = Field(..., description="예상 소요시간 (시간)")
    buffer_minutes: int = Field(..., description="버퍼 시간 (분)")
    effective_speed: float = Field(..., description="유효 속력 (kn)")


def decide_and_eta(
    inputs: MarineInputs,
    alpha: float = ALPHA,
    beta: float = BETA,
    k_wind: float = K_WIND,
    k_wave: float = K_WAVE,
) -> MarineOutput:
    """
    해양 운항 의사결정 및 ETA 계산.
    Marine operations decision making and ETA calculation.
    
    Args:
        inputs: 해양 운항 입력 데이터
        alpha: Combined → 등가 Hs 축소계수 (기본값: 0.85)
        beta: ADNOC 스무딩 보정 계수 (기본값: 0.80)
        k_wind: 풍속 감속 계수 (기본값: 0.06)
        k_wave: 파고 감속 계수 (기본값: 0.60)
    
    Returns:
        MarineOutput: 운항 결정 및 ETA 정보
    """
    
    # A) 단위 통일
    hs_onshore = inputs.hs_onshore_ft * FT_TO_M
    hs_offshore = inputs.hs_offshore_ft * FT_TO_M
    hs_from_adnoc = alpha * (inputs.combined_ft * FT_TO_M)
    
    # B) NCM(연안/외해) 혼합
    hs_ncm = (1 - inputs.offshore_weight) * hs_onshore + inputs.offshore_weight * hs_offshore
    
    # C) 경보 가중치
    gamma = ALERT_GAMMA.get((inputs.alert or "").strip(), 0.0)
    
    # D) 최종 파고 융합
    hs_fused = max(hs_ncm, beta * hs_from_adnoc) * (1 + gamma)
    
    # E) 풍속 융합
    wind_fused = max(inputs.wind_adnoc, inputs.wind_albahar)
    
    # F) Go/No-Go 게이트
    if (inputs.alert or "").lower().startswith("high seas") or (inputs.alert or "").lower() == "fog":
        decision = "No-Go"
    elif (hs_fused <= GO_THRESHOLD_HS) and (wind_fused <= GO_THRESHOLD_WIND) and gamma == 0.0:
        decision = "Go"
    elif (hs_fused <= CONDITIONAL_THRESHOLD_HS) or (wind_fused <= CONDITIONAL_THRESHOLD_WIND) or (gamma > 0.0):
        decision = "Conditional Go"
    else:
        decision = "No-Go"
    
    # G) 연안 창 완화 (선택적)
    if (decision == "No-Go") and (inputs.offshore_weight <= 0.40) and (hs_onshore <= 1.00) and (gamma <= 0.15):
        decision = "Conditional Go (coastal window)"
    
    # H) ETA 계산 (속력 손실 모델)
    f_wind = k_wind * max(wind_fused - 10.0, 0.0)
    f_wave = k_wave * hs_fused
    effective_speed = max(inputs.planned_speed - f_wind - f_wave, 0.1)
    eta_hours = inputs.distance_nm / effective_speed
    
    # I) 버퍼 시간
    buffer_minutes = 45 if inputs.offshore_weight <= 0.40 else 60
    
    return MarineOutput(
        hs_fused_m=round(hs_fused, 2),
        wind_fused_kt=round(wind_fused, 1),
        decision=decision,
        eta_hours=round(eta_hours, 1),
        buffer_minutes=buffer_minutes,
        effective_speed=round(effective_speed, 1),
    )


def create_sample_inputs() -> MarineInputs:
    """샘플 입력 데이터 생성. Create sample input data."""
    
    return MarineInputs(
        combined_ft=3.5,  # ADNOC Combined
        wind_adnoc=15.0,  # ADNOC 풍속
        hs_onshore_ft=2.0,  # Al Bahar 연안
        hs_offshore_ft=3.0,  # Al Bahar 외해
        wind_albahar=18.0,  # Al Bahar 풍속
        alert="rough at times westward",  # 경보
        offshore_weight=0.35,  # MW4↔AGI 항로
        distance_nm=120.0,  # 항로 거리
        planned_speed=12.0,  # 계획 속력
    )


if __name__ == "__main__":
    # 샘플 실행
    sample_inputs = create_sample_inputs()
    result = decide_and_eta(sample_inputs)
    
    print("=== 해양 운항 의사결정 결과 ===")
    print(f"입력 데이터: {sample_inputs.model_dump()}")
    print(f"결과: {result.model_dump()}")
