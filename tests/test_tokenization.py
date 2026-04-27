"""Tests for phoneme tokenization and navigation scaffolding."""

from phoneme_navigator.domain.neighbourhoods import candidate_moves
from phoneme_navigator.domain.tokenization import split_phoneme_tokens
from phoneme_navigator.services.navigation_service import NavigationService


def test_split_phoneme_tokens_preserves_separators():
    tokens = split_phoneme_tokens("h ə l oʊ / w ɜː l d")

    assert [token.text for token in tokens] == [
        "h",
        " ",
        "ə",
        " ",
        "l",
        " ",
        "oʊ",
        " ",
        "/",
        " ",
        "w",
        " ",
        "ɜː",
        " ",
        "l",
        " ",
        "d",
    ]
    assert tokens[1].token_type == "separator"
    assert tokens[1].is_editable is False


def test_navigation_service_normalizes_kokoro_ascii_markers():
    snapshot = NavigationService().build_snapshot("d'i:tAId")

    assert snapshot.phonemes == "dˈiːtAId"
    assert [token.text for token in snapshot.tokens[:4]] == ["d", "ˈ", "iː", "t"]
    assert snapshot.tokens[1].token_kind == "stress"
    assert snapshot.tokens[2].token_kind == "vowel"


def test_navigation_service_selects_first_editable_token():
    snapshot = NavigationService().build_snapshot("p a t")

    assert snapshot.selected_index == 0
    assert snapshot.tokens[0].token_kind == "consonant"
    assert snapshot.tokens[0].candidates[0].replacement == "b"


def test_candidate_moves_include_richer_metadata():
    tokens = split_phoneme_tokens("ə")

    moves = candidate_moves(tokens[0])

    assert moves[0].direction == "up"
    assert moves[0].replacement == "ɪ"
    assert moves[0].label == "closer"
