"""해양 운항 의사결정 테스트. Marine decision making tests."""

from __future__ import annotations

import pytest

from marine_ops.core.marine_decision import MarineInputs, decide_and_eta


def test_marine_decision_go_condition() -> None:
    """Go 조건 테스트. Test Go condition."""
    
    inputs = MarineInputs(
        combined_ft=2.0,  # 낮은 파고
        wind_adnoc=15.0,  # 낮은 풍속
        hs_onshore_ft=1.5,
        hs_offshore_ft=2.0,
        wind_albahar=18.0,
        alert=None,  # 경보 없음
        offshore_weight=0.35,
        distance_nm=120.0,
        planned_speed=12.0,
    )
    
    result = decide_and_eta(inputs)
    
    assert result.decision == "Go"
    assert result.hs_fused_m <= 1.00
    assert result.wind_fused_kt <= 20.0


def test_marine_decision_conditional_condition() -> None:
    """Conditional Go 조건 테스트. Test Conditional Go condition."""
    
    inputs = MarineInputs(
        combined_ft=3.0,  # 중간 파고
        wind_adnoc=18.0,  # 중간 풍속
        hs_onshore_ft=2.0,
        hs_offshore_ft=2.5,
        wind_albahar=20.0,
        alert="rough at times westward",  # 경보 있음
        offshore_weight=0.35,
        distance_nm=120.0,
        planned_speed=12.0,
    )
    
    result = decide_and_eta(inputs)
    
    assert result.decision == "Conditional Go"
    # 경보가 있으면 Conditional Go가 되어야 함 (풍속이 20 이상이거나 경보가 있으면)
    assert result.wind_fused_kt >= 20.0 or result.hs_fused_m > 1.00


def test_marine_decision_no_go_condition() -> None:
    """No-Go 조건 테스트. Test No-Go condition."""
    
    inputs = MarineInputs(
        combined_ft=5.0,  # 높은 파고
        wind_adnoc=25.0,  # 높은 풍속
        hs_onshore_ft=3.0,
        hs_offshore_ft=4.0,
        wind_albahar=28.0,
        alert="High seas",  # 심각한 경보
        offshore_weight=0.35,
        distance_nm=120.0,
        planned_speed=12.0,
    )
    
    result = decide_and_eta(inputs)
    
    assert result.decision == "No-Go"
    assert result.hs_fused_m > 1.20 or result.wind_fused_kt > 22.0


def test_marine_decision_coastal_window() -> None:
    """연안 창 완화 테스트. Test coastal window relaxation."""
    
    inputs = MarineInputs(
        combined_ft=4.0,  # 높은 파고
        wind_adnoc=22.0,  # 높은 풍속
        hs_onshore_ft=0.8,  # 낮은 연안 파고
        hs_offshore_ft=3.5,
        wind_albahar=25.0,
        alert="rough at times westward",  # 경보 있음
        offshore_weight=0.30,  # 연안 비중 높음
        distance_nm=120.0,
        planned_speed=12.0,
    )
    
    result = decide_and_eta(inputs)
    
    # 연안 창 완화가 적용되어야 함 (조건을 만족하면)
    # 실제로는 No-Go가 될 수 있으므로 조건을 확인
    if (inputs.offshore_weight <= 0.40 and inputs.hs_onshore_ft * 0.3048 <= 1.00):
        assert result.decision in ["Conditional Go", "Conditional Go (coastal window)"]
    else:
        assert result.decision in ["No-Go", "Conditional Go"]


def test_eta_calculation() -> None:
    """ETA 계산 테스트. Test ETA calculation."""
    
    inputs = MarineInputs(
        combined_ft=2.0,
        wind_adnoc=15.0,
        hs_onshore_ft=1.5,
        hs_offshore_ft=2.0,
        wind_albahar=18.0,
        alert=None,
        offshore_weight=0.35,
        distance_nm=120.0,
        planned_speed=12.0,
    )
    
    result = decide_and_eta(inputs)
    
    # ETA는 거리/속력으로 계산되어야 함
    expected_eta = 120.0 / 12.0  # 10시간
    assert abs(result.eta_hours - expected_eta) < 1.0  # 1시간 오차 허용
    assert result.effective_speed > 0
    assert result.buffer_minutes in [45, 60]


def test_unit_conversion() -> None:
    """단위 변환 테스트. Test unit conversion."""
    
    inputs = MarineInputs(
        combined_ft=3.28084,  # 1미터 = 3.28084피트
        wind_adnoc=15.0,
        hs_onshore_ft=1.0,
        hs_offshore_ft=1.0,
        wind_albahar=15.0,
        alert=None,
        offshore_weight=0.5,
        distance_nm=100.0,
        planned_speed=10.0,
    )
    
    result = decide_and_eta(inputs)
    
    # 피트에서 미터로 변환 확인
    assert result.hs_fused_m > 0
    assert result.hs_fused_m < 2.0  # 1미터 근처여야 함


def test_alert_weighting() -> None:
    """경보 가중치 테스트. Test alert weighting."""
    
    # 경보 없음
    inputs_no_alert = MarineInputs(
        combined_ft=2.0,
        wind_adnoc=15.0,
        hs_onshore_ft=1.5,
        hs_offshore_ft=2.0,
        wind_albahar=18.0,
        alert=None,
        offshore_weight=0.35,
        distance_nm=120.0,
        planned_speed=12.0,
    )
    
    # 경보 있음
    inputs_with_alert = MarineInputs(
        combined_ft=2.0,
        wind_adnoc=15.0,
        hs_onshore_ft=1.5,
        hs_offshore_ft=2.0,
        wind_albahar=18.0,
        alert="rough at times westward",
        offshore_weight=0.35,
        distance_nm=120.0,
        planned_speed=12.0,
    )
    
    result_no_alert = decide_and_eta(inputs_no_alert)
    result_with_alert = decide_and_eta(inputs_with_alert)
    
    # 경보가 있으면 파고가 더 높게 계산되어야 함
    assert result_with_alert.hs_fused_m > result_no_alert.hs_fused_m
