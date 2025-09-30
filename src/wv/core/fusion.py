"""ADNOC × Al Bahar 융합 의사결정. ADNOC × Al Bahar fusion decision."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Literal

FT_TO_M = 0.3048
ALERT_GAMMA = {
    None: 0.0,
    "": 0.0,
    "rough at times westward": 0.15,
    "High seas": 0.30,
    "Fog": 0.0,  # Fog는 게이트에서 직접 No-Go 처리
}


@dataclass
class Inputs:
    """입력 데이터. Input data."""

    C_ft: float  # ADNOC Combined(seas) in feet
    W_adnoc: float  # ADNOC wind speed in knots
    Hs_on_ft: float  # Al Bahar onshore significant wave height in feet
    Hs_off_ft: float  # Al Bahar offshore significant wave height in feet
    W_albahar: float  # Al Bahar wind speed in knots
    alert: str | None  # Al Bahar alert message
    w_off: float  # Offshore weight (0-1)
    D_NM: float  # Distance in nautical miles
    V_plan: float  # Planned speed in knots


@dataclass
class Output:
    """출력 결과. Output result."""

    Hs_fused_m: float  # Fused significant wave height in meters
    W_fused_kt: float  # Fused wind speed in knots
    decision: str  # Go/Conditional Go/No-Go decision
    ETA_hours: float  # Estimated time of arrival in hours
    buffer_min: int  # Buffer time in minutes


def decide_and_eta(
    inp: Inputs,
    alpha: float = 0.85,
    beta: float = 0.80,
    k_wind: float = 0.06,
    k_wave: float = 0.60,
) -> Output:
    """ADNOC × Al Bahar 융합 의사결정 및 ETA 계산. ADNOC × Al Bahar fusion decision and ETA calculation.
    
    Args:
        inp: 입력 데이터. Input data
        alpha: Combined → 등가 Hs 축소계수. Combined to equivalent Hs reduction factor
        beta: ADNOC 스무딩 보정. ADNOC smoothing correction
        k_wind: 풍속 감속 계수. Wind speed reduction coefficient
        k_wave: 파고 감속 계수. Wave height reduction coefficient
        
    Returns:
        의사결정 결과. Decision result
    """
    # A) 단위 통일 (Unit normalization)
    Hs_on = inp.Hs_on_ft * FT_TO_M
    Hs_off = inp.Hs_off_ft * FT_TO_M
    Hs_from_ADNOC = alpha * (inp.C_ft * FT_TO_M)
    
    # B) NCM(연안/외해) 혼합 (NCM coastal/offshore blend)
    Hs_NCM = (1 - inp.w_off) * Hs_on + inp.w_off * Hs_off
    
    # C) 최종 파고 융합 (Final wave height fusion)
    gamma = ALERT_GAMMA.get((inp.alert or "").strip(), 0.0)
    Hs_fused = max(Hs_NCM, beta * Hs_from_ADNOC) * (1 + gamma)
    
    # D) 풍속 융합 (Wind speed fusion)
    W_fused = max(inp.W_adnoc, inp.W_albahar)
    
    # E) Go/No-Go 게이트 (Go/No-Go gates)
    if (inp.alert or "").lower().startswith("high seas") or (inp.alert or "").lower() == "fog":
        decision = "No-Go"
    elif (Hs_fused <= 1.00) and (W_fused <= 20) and gamma == 0.0:
        decision = "Go"
    elif (Hs_fused <= 1.20) or (W_fused <= 22) or (gamma > 0.0):
        decision = "Conditional Go"
    else:
        decision = "No-Go"
    
    # 선택적 연안 윈도잉 (Optional coastal windowing)
    if (decision == "No-Go") and (inp.w_off <= 0.40) and (Hs_on <= 1.00) and (gamma <= 0.15):
        decision = "Conditional Go (coastal window)"
    
    # F) ETA 계산 (ETA calculation)
    f_wind = k_wind * max(W_fused - 10.0, 0.0)
    f_wave = k_wave * Hs_fused
    V_eff = max(inp.V_plan - f_wind - f_wave, 0.1)
    ETA_h = inp.D_NM / V_eff
    
    # 버퍼 시간 (Buffer time)
    buffer_min = 45 if inp.w_off <= 0.40 else 60
    
    return Output(Hs_fused, W_fused, decision, ETA_h, buffer_min)
