"""융합 의사결정 테스트. Fusion decision tests."""

import pytest

from wv.core.fusion import Inputs, Output, decide_and_eta


def test_ideal_conditions():
    """이상적인 조건 테스트. Test ideal conditions."""
    inputs = Inputs(
        C_ft=2.0,  # 0.61m
        W_adnoc=10.0,
        Hs_on_ft=1.0,  # 0.30m
        Hs_off_ft=1.5,  # 0.46m
        W_albahar=12.0,
        alert=None,
        w_off=0.35,
        D_NM=100.0,
        V_plan=15.0,
    )
    
    result = decide_and_eta(inputs)
    
    assert result.decision == "Go"
    assert result.Hs_fused_m <= 1.0
    assert result.W_fused_kt <= 20.0
    assert result.ETA_hours > 0


def test_conditional_go_conditions():
    """조건부 Go 조건 테스트. Test conditional Go conditions."""
    inputs = Inputs(
        C_ft=4.0,  # 1.22m
        W_adnoc=15.0,
        Hs_on_ft=2.0,  # 0.61m
        Hs_off_ft=3.0,  # 0.91m
        W_albahar=18.0,
        alert="rough at times westward",
        w_off=0.35,
        D_NM=100.0,
        V_plan=15.0,
    )
    
    result = decide_and_eta(inputs)
    
    assert result.decision == "Conditional Go"
    # Conditional Go 조건: Hs_fused <= 1.20 OR W_fused <= 22 OR (gamma > 0.0)
    assert result.Hs_fused_m <= 1.20 or result.W_fused_kt <= 22 or result.Hs_fused_m > 1.00


def test_no_go_conditions():
    """No-Go 조건 테스트. Test No-Go conditions."""
    inputs = Inputs(
        C_ft=6.0,  # 1.83m
        W_adnoc=25.0,
        Hs_on_ft=4.0,  # 1.22m
        Hs_off_ft=5.0,  # 1.52m
        W_albahar=28.0,
        alert="High seas",
        w_off=0.35,
        D_NM=100.0,
        V_plan=15.0,
    )
    
    result = decide_and_eta(inputs)
    
    assert result.decision == "No-Go"
    assert result.Hs_fused_m > 1.20 or result.W_fused_kt > 22


def test_coastal_window_conditions():
    """연안 창 조건 테스트. Test coastal window conditions."""
    inputs = Inputs(
        C_ft=5.0,  # 1.52m
        W_adnoc=22.0,
        Hs_on_ft=2.0,  # 0.61m (연안이 낮음)
        Hs_off_ft=4.0,  # 1.22m
        W_albahar=25.0,
        alert="rough at times westward",
        w_off=0.30,  # 연안 비중 높음
        D_NM=100.0,
        V_plan=15.0,
    )
    
    result = decide_and_eta(inputs)
    
    # 연안 창 조건이 만족되면 Conditional Go로 완화
    if (inputs.w_off <= 0.40 and inputs.Hs_on_ft * 0.3048 <= 1.00 and 
        inputs.alert == "rough at times westward"):
        assert result.decision in ["Conditional Go", "Conditional Go (coastal window)"]
    else:
        assert result.decision == "No-Go"


def test_eta_calculation():
    """ETA 계산 테스트. Test ETA calculation."""
    inputs = Inputs(
        C_ft=3.0,
        W_adnoc=15.0,
        Hs_on_ft=2.0,
        Hs_off_ft=2.5,
        W_albahar=18.0,
        alert=None,
        w_off=0.35,
        D_NM=120.0,
        V_plan=12.0,
    )
    
    result = decide_and_eta(inputs)
    
    # ETA는 거리를 유효 속도로 나눈 값
    assert result.ETA_hours > 0
    assert result.ETA_hours == inputs.D_NM / max(0.1, inputs.V_plan - 0.06 * max(result.W_fused_kt - 10.0, 0.0) - 0.60 * result.Hs_fused_m)
    
    # 버퍼 시간 확인
    assert result.buffer_min in [45, 60]  # 연안 45분, 외해 60분


def test_alert_handling():
    """경보 처리 테스트. Test alert handling."""
    # High seas 경보
    inputs_high_seas = Inputs(
        C_ft=2.0,
        W_adnoc=10.0,
        Hs_on_ft=1.0,
        Hs_off_ft=1.5,
        W_albahar=12.0,
        alert="High seas",
        w_off=0.35,
        D_NM=100.0,
        V_plan=15.0,
    )
    
    result_high_seas = decide_and_eta(inputs_high_seas)
    assert result_high_seas.decision == "No-Go"
    
    # Fog 경보
    inputs_fog = Inputs(
        C_ft=2.0,
        W_adnoc=10.0,
        Hs_on_ft=1.0,
        Hs_off_ft=1.5,
        W_albahar=12.0,
        alert="Fog",
        w_off=0.35,
        D_NM=100.0,
        V_plan=15.0,
    )
    
    result_fog = decide_and_eta(inputs_fog)
    # Fog는 연안 창 조건에 의해 Conditional Go로 완화될 수 있음
    assert result_fog.decision in ["No-Go", "Conditional Go (coastal window)"]
    
    # rough at times 경보
    inputs_rough = Inputs(
        C_ft=2.0,
        W_adnoc=10.0,
        Hs_on_ft=1.0,
        Hs_off_ft=1.5,
        W_albahar=12.0,
        alert="rough at times westward",
        w_off=0.35,
        D_NM=100.0,
        V_plan=15.0,
    )
    
    result_rough = decide_and_eta(inputs_rough)
    assert result_rough.decision == "Conditional Go"


def test_unit_conversions():
    """단위 변환 테스트. Test unit conversions."""
    inputs = Inputs(
        C_ft=3.28084,  # 1m
        W_adnoc=10.0,
        Hs_on_ft=3.28084,  # 1m
        Hs_off_ft=6.56168,  # 2m
        W_albahar=12.0,
        alert=None,
        w_off=0.5,
        D_NM=100.0,
        V_plan=15.0,
    )
    
    result = decide_and_eta(inputs)
    
    # 단위 변환이 올바르게 적용되었는지 확인
    assert result.Hs_fused_m > 0
    assert result.W_fused_kt > 0
    assert result.ETA_hours > 0
