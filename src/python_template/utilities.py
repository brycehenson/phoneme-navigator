"""Reusable helper functions."""

from __future__ import annotations


def calculate_percentage(part: float, whole: float) -> float:
    """Return the percentage (0-100) that *part* represents of *whole*."""
    if whole == 0:
        raise ValueError("whole must be non-zero to calculate a percentage")

    return (part / whole) * 100
