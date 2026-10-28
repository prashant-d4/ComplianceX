"""Deterministic unit conversion and area comparison helpers."""

from typing import Tuple, Optional

# Standard conversion constants
# 1 international acre = 4046.8564224 square metres
SQM_PER_ACRE = 4046.8564224
# 1 international square foot = 0.09290304 square metres
SQM_PER_SQFT = 0.09290304


def standardize_area_unit(unit_str: Optional[str]) -> Optional[str]:
    """Standardize area unit string to a canonical token."""
    if not unit_str:
        return None
    low = unit_str.strip().lower()
    if "acre" in low:
        return "acres"
    elif "sq.m" in low or "sqm" in low or "square metre" in low or "square meter" in low:
        return "square metres"
    elif "sq.ft" in low or "sqft" in low or "square feet" in low or "square foot" in low:
        return "square feet"
    return low


def convert_area_to_sqm(value: float, unit: str) -> Optional[float]:
    """Convert an area measurement to square metres deterministically."""
    canonical = standardize_area_unit(unit)
    if canonical == "square metres":
        return value
    elif canonical == "acres":
        return value * SQM_PER_ACRE
    elif canonical == "square feet":
        return value * SQM_PER_SQFT
    return None


def convert_area_to_acres(value: float, unit: str) -> Optional[float]:
    """Convert an area measurement to acres deterministically."""
    canonical = standardize_area_unit(unit)
    if canonical == "acres":
        return value
    elif canonical == "square metres":
        return value / SQM_PER_ACRE
    elif canonical == "square feet":
        return (value * SQM_PER_SQFT) / SQM_PER_ACRE
    return None


def compare_areas(
    val1: float,
    unit1: Optional[str],
    val2: float,
    unit2: Optional[str],
    tolerance_ratio: float = 0.005,
) -> Tuple[bool, float, float, str]:
    """
    Compare two area measurements with deterministic unit conversion.
    
    Returns:
        (is_match, norm_val1, norm_val2, comparison_unit)
    
    If both share the same unit, compare in that unit.
    If units differ, both are normalized to acres (or square metres if both are metric).
    Allows a strict 0.5% tolerance only for unit rounding differences.
    """
    u1 = standardize_area_unit(unit1) or "acres"
    u2 = standardize_area_unit(unit2) or "acres"

    if u1 == u2:
        # Same unit direct comparison
        diff = abs(val1 - val2)
        # For direct same-unit comparison, use strict absolute tolerance of 0.01
        is_match = diff <= 0.01
        return is_match, round(val1, 3), round(val2, 3), u1

    # Units differ - convert to square metres for universal comparison
    sqm1 = convert_area_to_sqm(val1, u1)
    sqm2 = convert_area_to_sqm(val2, u2)

    if sqm1 is None or sqm2 is None:
        return False, val1, val2, "unsupported_units"

    diff_ratio = abs(sqm1 - sqm2) / max(sqm1, sqm2)
    is_match = diff_ratio <= tolerance_ratio

    # Return values normalized to val1's preferred unit for intuitive reading
    if u1 == "acres":
        acres2 = convert_area_to_acres(val2, u2) or val2
        return is_match, round(val1, 3), round(acres2, 3), "acres"
    else:
        return is_match, round(sqm1, 2), round(sqm2, 2), "square metres"
