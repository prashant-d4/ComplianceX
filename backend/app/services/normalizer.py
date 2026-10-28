"""Normalization helpers for dates, numbers, and units."""

import re
from typing import Optional, Tuple
from datetime import datetime

MONTHS = {
    "january": 1, "february": 2, "march": 3, "april": 4, "may": 5, "june": 6,
    "july": 7, "august": 8, "september": 9, "october": 10, "november": 11, "december": 12,
    "jan": 1, "feb": 2, "mar": 3, "apr": 4, "jun": 6, "jul": 7, "aug": 8,
    "sep": 9, "oct": 10, "nov": 11, "dec": 12
}


def normalize_date(text: str) -> Optional[str]:
    """Parse text into ISO YYYY-MM-DD date string, or None if unrecognized."""
    if not text:
        return None

    cleaned = text.strip()

    # Pattern: 15 October 2026 or 1 July 2025
    m = re.search(r"(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})", cleaned)
    if m:
        day = int(m.group(1))
        month_str = m.group(2).lower()
        year = int(m.group(3))
        if month_str in MONTHS:
            try:
                dt = datetime(year, MONTHS[month_str], day)
                return dt.strftime("%Y-%m-%d")
            except ValueError:
                pass

    # Pattern: October 15, 2026
    m2 = re.search(r"([A-Za-z]+)\s+(\d{1,2}),?\s+(\d{4})", cleaned)
    if m2:
        month_str = m2.group(1).lower()
        day = int(m2.group(2))
        year = int(m2.group(3))
        if month_str in MONTHS:
            try:
                dt = datetime(year, MONTHS[month_str], day)
                return dt.strftime("%Y-%m-%d")
            except ValueError:
                pass

    # Pattern: YYYY-MM-DD
    m3 = re.search(r"(\d{4})[-/](\d{1,2})[-/](\d{1,2})", cleaned)
    if m3:
        try:
            dt = datetime(int(m3.group(1)), int(m3.group(2)), int(m3.group(3)))
            return dt.strftime("%Y-%m-%d")
        except ValueError:
            pass

    # Pattern: DD-MM-YYYY or DD/MM/YYYY
    m4 = re.search(r"(\d{1,2})[-/](\d{1,2})[-/](\d{4})", cleaned)
    if m4:
        try:
            dt = datetime(int(m4.group(3)), int(m4.group(2)), int(m4.group(1)))
            return dt.strftime("%Y-%m-%d")
        except ValueError:
            pass

    return None


def normalize_number(text: str) -> Optional[float]:
    """Extract and parse floating point / integer number from text string."""
    if not text:
        return None

    # Remove commas and extract first number
    cleaned = text.replace(",", "")
    m = re.search(r"[-+]?\d*\.?\d+", cleaned)
    if m:
        try:
            val = float(m.group(0))
            return int(val) if val.is_integer() else val
        except ValueError:
            return None
    return None


def normalize_area(text: str) -> Tuple[Optional[float], Optional[str]]:
    """Extract numeric value and standardize area unit (acres, sq.m, etc.)."""
    if not text:
        return None, None

    val = normalize_number(text)
    low = text.lower()

    unit = None
    if "acre" in low:
        unit = "acres"
    elif "sq.m" in low or "sqm" in low or "square metre" in low or "square meter" in low:
        unit = "square metres"
    elif "sq.ft" in low or "sqft" in low or "square feet" in low:
        unit = "square feet"
    elif "hectare" in low:
        unit = "hectares"

    return val, unit
