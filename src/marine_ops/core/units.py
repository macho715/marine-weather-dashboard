"""해양 단위 변환. Marine unit conversions."""

from __future__ import annotations

from typing import Literal

Unit = Literal["m", "ft", "m/s", "kt", "deg", "km", "s"]


def convert_units(value: float, from_unit: Unit, to_unit: Unit) -> float:
    """단위 변환. Convert units.
    
    Args:
        value: 변환할 값. Value to convert
        from_unit: 원본 단위. Source unit
        to_unit: 대상 단위. Target unit
        
    Returns:
        변환된 값. Converted value
    """
    # 길이 변환 (Length conversions)
    if from_unit == "ft" and to_unit == "m":
        return value * 0.3048
    elif from_unit == "m" and to_unit == "ft":
        return value / 0.3048
    
    # 속도 변환 (Speed conversions)
    elif from_unit == "kt" and to_unit == "m/s":
        return value * 0.514444
    elif from_unit == "m/s" and to_unit == "kt":
        return value / 0.514444
    
    # 동일 단위 (Same units)
    elif from_unit == to_unit:
        return value
    
    else:
        raise ValueError(f"Unsupported unit conversion: {from_unit} -> {to_unit}")


def knots_to_ms(knots: float) -> float:
    """노트를 m/s로 변환. Convert knots to m/s."""
    return convert_units(knots, "kt", "m/s")


def ms_to_knots(ms: float) -> float:
    """m/s를 노트로 변환. Convert m/s to knots."""
    return convert_units(ms, "m/s", "kt")


def feet_to_meters(feet: float) -> float:
    """피트를 미터로 변환. Convert feet to meters."""
    return convert_units(feet, "ft", "m")


def meters_to_feet(meters: float) -> float:
    """미터를 피트로 변환. Convert meters to feet."""
    return convert_units(meters, "m", "ft")
