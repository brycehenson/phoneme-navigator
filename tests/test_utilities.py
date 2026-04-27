"""Tests for phoneme navigation utility helpers."""

from phoneme_navigator.domain.tokenization import (
    classify_ipa_token,
    normalize_phoneme_string,
)


def test_normalize_phoneme_string_converts_kokoro_markers():
    assert normalize_phoneme_string("d'i:tʤ") == "dˈiːtdʒ"


def test_classify_ipa_token_returns_expected_coarse_class():
    assert classify_ipa_token("ə") == "vowel"
    assert classify_ipa_token("ˈ") == "stress"
    assert classify_ipa_token(" ") == "separator"
    assert classify_ipa_token("d") == "consonant"
