"""Candidate phoneme neighbourhood generation."""

from __future__ import annotations

from dataclasses import dataclass

from phoneme_navigator.domain.tokenization import RawToken
from phoneme_navigator.models.phonemes import CandidateMove, Direction


@dataclass(frozen=True, kw_only=True)
class CandidateMoveSpec:
    """Internal candidate move representation."""

    direction: Direction
    replacement: str
    label: str
    action: str = "replace"


CANDIDATES: dict[str, list[CandidateMoveSpec]] = {
    "ʌ": [
        CandidateMoveSpec(direction="up", replacement="ə", label="weaker / reduced"),
        CandidateMoveSpec(direction="down", replacement="ɐ", label="more open"),
        CandidateMoveSpec(direction="left", replacement="ɒ", label="rounder"),
        CandidateMoveSpec(direction="right", replacement="ɑ", label="darker / backer"),
    ],
    "ə": [
        CandidateMoveSpec(direction="up", replacement="ɪ", label="closer"),
        CandidateMoveSpec(direction="down", replacement="ʌ", label="stronger / fuller"),
        CandidateMoveSpec(direction="left", replacement="ɚ", label="r-coloured"),
        CandidateMoveSpec(direction="right", replacement="ɐ", label="more open"),
    ],
    "ɐ": [
        CandidateMoveSpec(direction="up", replacement="ʌ", label="less open"),
        CandidateMoveSpec(direction="left", replacement="ɒ", label="rounder"),
        CandidateMoveSpec(direction="right", replacement="ɑ", label="backer"),
        CandidateMoveSpec(direction="down", replacement="a", label="more open"),
    ],
    "ɑ": [
        CandidateMoveSpec(direction="up", replacement="ʌ", label="centraler"),
        CandidateMoveSpec(direction="left", replacement="ɒ", label="rounder"),
        CandidateMoveSpec(direction="right", replacement="æ", label="fronter"),
        CandidateMoveSpec(direction="down", replacement="a", label="more open"),
    ],
    "ɒ": [
        CandidateMoveSpec(direction="up", replacement="ɔ", label="closer"),
        CandidateMoveSpec(direction="right", replacement="ɑ", label="unrounded"),
        CandidateMoveSpec(
            direction="down", replacement="ɐ", label="less rounded / central"
        ),
    ],
    "æ": [
        CandidateMoveSpec(direction="up", replacement="ɛ", label="closer"),
        CandidateMoveSpec(direction="down", replacement="a", label="more open"),
        CandidateMoveSpec(direction="left", replacement="ɑ", label="backer"),
        CandidateMoveSpec(direction="right", replacement="e", label="tenser / fronter"),
    ],
    "ɛ": [
        CandidateMoveSpec(direction="up", replacement="ɪ", label="closer"),
        CandidateMoveSpec(direction="down", replacement="æ", label="more open"),
        CandidateMoveSpec(direction="right", replacement="e", label="tenser"),
        CandidateMoveSpec(direction="left", replacement="ɜ", label="centraler"),
    ],
    "ɪ": [
        CandidateMoveSpec(direction="up", replacement="i", label="tenser / closer"),
        CandidateMoveSpec(direction="down", replacement="ɛ", label="more open"),
        CandidateMoveSpec(direction="left", replacement="ɜ", label="centraler"),
        CandidateMoveSpec(direction="right", replacement="e", label="tenser"),
    ],
    "i": [
        CandidateMoveSpec(direction="down", replacement="ɪ", label="laxer"),
        CandidateMoveSpec(direction="left", replacement="ɨ", label="centraler"),
    ],
    "ʊ": [
        CandidateMoveSpec(direction="up", replacement="u", label="tenser / closer"),
        CandidateMoveSpec(direction="down", replacement="ɔ", label="more open"),
        CandidateMoveSpec(direction="left", replacement="ɪ", label="less rounded"),
        CandidateMoveSpec(
            direction="right", replacement="oʊ", label="tenser / diphthongal"
        ),
    ],
    "u": [
        CandidateMoveSpec(direction="down", replacement="ʊ", label="laxer"),
        CandidateMoveSpec(direction="left", replacement="i", label="less rounded / fronter"),
    ],
    "ɔ": [
        CandidateMoveSpec(
            direction="up", replacement="oʊ", label="closer / diphthongal"
        ),
        CandidateMoveSpec(direction="down", replacement="ɒ", label="more open"),
        CandidateMoveSpec(direction="right", replacement="ɑ", label="unrounded"),
    ],
    "oʊ": [
        CandidateMoveSpec(direction="down", replacement="ɔ", label="less diphthongal"),
        CandidateMoveSpec(direction="left", replacement="ʊ", label="shorter / laxer"),
    ],
    "eɪ": [
        CandidateMoveSpec(direction="down", replacement="ɛ", label="less diphthongal"),
        CandidateMoveSpec(direction="left", replacement="ɪ", label="shorter / laxer"),
    ],
    "aɪ": [
        CandidateMoveSpec(direction="up", replacement="æ", label="less diphthongal"),
        CandidateMoveSpec(direction="left", replacement="ɑ", label="backer onset"),
        CandidateMoveSpec(direction="right", replacement="eɪ", label="closer onset"),
    ],
    "aʊ": [
        CandidateMoveSpec(direction="up", replacement="æ", label="less diphthongal"),
        CandidateMoveSpec(direction="left", replacement="ɑ", label="backer onset"),
        CandidateMoveSpec(direction="right", replacement="oʊ", label="rounder glide"),
    ],
    "ɔɪ": [
        CandidateMoveSpec(direction="up", replacement="oʊ", label="closer onset"),
        CandidateMoveSpec(direction="left", replacement="aɪ", label="less rounded"),
    ],
    "p": [
        CandidateMoveSpec(direction="up", replacement="b", label="voiced"),
        CandidateMoveSpec(direction="right", replacement="f", label="fricative"),
        CandidateMoveSpec(direction="down", replacement="", label="delete", action="delete"),
    ],
    "b": [
        CandidateMoveSpec(direction="up", replacement="p", label="voiceless"),
        CandidateMoveSpec(direction="right", replacement="v", label="fricative"),
        CandidateMoveSpec(direction="down", replacement="", label="delete", action="delete"),
    ],
    "t": [
        CandidateMoveSpec(direction="up", replacement="d", label="voiced"),
        CandidateMoveSpec(direction="left", replacement="s", label="fricative"),
        CandidateMoveSpec(direction="right", replacement="tʃ", label="affricate"),
        CandidateMoveSpec(direction="down", replacement="", label="delete", action="delete"),
    ],
    "d": [
        CandidateMoveSpec(direction="up", replacement="t", label="voiceless"),
        CandidateMoveSpec(direction="left", replacement="z", label="fricative"),
        CandidateMoveSpec(direction="right", replacement="dʒ", label="affricate"),
        CandidateMoveSpec(direction="down", replacement="", label="delete", action="delete"),
    ],
    "k": [
        CandidateMoveSpec(direction="up", replacement="g", label="voiced"),
        CandidateMoveSpec(direction="right", replacement="x", label="fricative"),
        CandidateMoveSpec(direction="down", replacement="", label="delete", action="delete"),
    ],
    "g": [
        CandidateMoveSpec(direction="up", replacement="k", label="voiceless"),
        CandidateMoveSpec(direction="right", replacement="ɣ", label="fricative"),
        CandidateMoveSpec(direction="down", replacement="", label="delete", action="delete"),
    ],
    "s": [
        CandidateMoveSpec(direction="up", replacement="z", label="voiced"),
        CandidateMoveSpec(direction="left", replacement="t", label="stop"),
        CandidateMoveSpec(direction="right", replacement="ʃ", label="postalveolar"),
        CandidateMoveSpec(direction="down", replacement="", label="delete", action="delete"),
    ],
    "z": [
        CandidateMoveSpec(direction="up", replacement="s", label="voiceless"),
        CandidateMoveSpec(direction="left", replacement="d", label="stop"),
        CandidateMoveSpec(direction="right", replacement="ʒ", label="postalveolar"),
        CandidateMoveSpec(direction="down", replacement="", label="delete", action="delete"),
    ],
    "ʃ": [
        CandidateMoveSpec(direction="left", replacement="s", label="alveolar"),
        CandidateMoveSpec(direction="right", replacement="tʃ", label="affricate"),
    ],
    "ʒ": [
        CandidateMoveSpec(direction="left", replacement="z", label="alveolar"),
        CandidateMoveSpec(direction="right", replacement="dʒ", label="affricate"),
    ],
    "ˈ": [
        CandidateMoveSpec(
            direction="left",
            replacement="",
            label="delete stress",
            action="delete",
        ),
    ],
}

OPPOSITE_DIRECTIONS: dict[Direction, Direction] = {
    "up": "down",
    "down": "up",
    "left": "right",
    "right": "left",
    "up_left": "down_right",
    "up_right": "down_left",
    "down_left": "up_right",
    "down_right": "up_left",
}


def _remove_one_aspiration_marker(text: str) -> str:
    """Remove one aspiration marker from a consonant-like token."""
    return text[:-1] if text.endswith("ʰ") else text


def _generic_candidates(token: RawToken) -> list[CandidateMoveSpec]:
    """Return fallback candidates for tokens not yet in the explicit table."""
    if token.token_kind == "vowel":
        return [
            CandidateMoveSpec(direction="up", replacement="ə", label="reduce"),
            CandidateMoveSpec(direction="down", replacement="a", label="open"),
            CandidateMoveSpec(direction="left", replacement="ɒ", label="round / back"),
            CandidateMoveSpec(direction="right", replacement="æ", label="front"),
        ]

    if token.token_kind == "stress":
        return [
            CandidateMoveSpec(
                direction="left",
                replacement="",
                label="delete stress",
                action="delete",
            )
        ]

    if token.token_kind == "consonant":
        weaker = _remove_one_aspiration_marker(token.text)
        weaker_label = (
            "less aspirated" if weaker != token.text else "delete"
        )
        return [
            CandidateMoveSpec(direction="up", replacement=token.text + "ʰ", label="aspirated"),
            CandidateMoveSpec(
                direction="down",
                replacement=weaker if weaker != token.text else "",
                label=weaker_label,
                action="replace" if weaker != token.text else "delete",
            ),
            CandidateMoveSpec(
                direction="right",
                replacement="ˈ",
                label="insert stress before",
                action="insert_stress_before",
            ),
            CandidateMoveSpec(
                direction="left",
                replacement=token.text,
                label="copy before",
                action="insert_copy_before",
            ),
        ]

    return []


def _infer_reverse_replace_moves(token: RawToken) -> list[CandidateMoveSpec]:
    """Infer reversible replacement moves missing from the explicit graph."""
    inferred: list[CandidateMoveSpec] = []
    for source_text, source_moves in CANDIDATES.items():
        for move in source_moves:
            if move.action != "replace":
                continue
            if move.replacement != token.text:
                continue
            inferred.append(
                CandidateMoveSpec(
                    direction=OPPOSITE_DIRECTIONS[move.direction],
                    replacement=source_text,
                    label=f"reverse of {move.label}",
                )
            )
    return inferred


def candidate_moves(token: RawToken) -> list[CandidateMove]:
    """Return local edit candidates for a token."""
    if not token.is_editable:
        return []

    specs = list(CANDIDATES.get(token.text, _generic_candidates(token)))
    seen_directions = {spec.direction for spec in specs}
    for spec in _infer_reverse_replace_moves(token):
        if spec.direction in seen_directions:
            continue
        specs.append(spec)
        seen_directions.add(spec.direction)

    return [
        CandidateMove(
            direction=spec.direction,
            replacement=spec.replacement,
            label=spec.label,
            action=spec.action,  # type: ignore[arg-type]
        )
        for spec in specs
    ]
