"""Tests for python_template.utilities."""

import pytest

from python_template.utilities import calculate_percentage


def test_calculate_percentage_returns_expected_value():
    assert calculate_percentage(25, 100) == 25
    assert calculate_percentage(1, 4) == 25


def test_calculate_percentage_rejects_zero_whole():
    with pytest.raises(ValueError):
        calculate_percentage(1, 0)
