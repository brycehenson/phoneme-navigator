"""Structured models representing editable phoneme strings."""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field

Direction = Literal[
    "up",
    "down",
    "left",
    "right",
    "up_left",
    "up_right",
    "down_left",
    "down_right",
]
MoveAction = Literal[
    "replace",
    "delete",
    "insert_stress_before",
    "insert_copy_before",
]
TokenKind = Literal[
    "vowel",
    "consonant",
    "stress",
    "diacritic",
    "separator",
]


class CandidateMove(BaseModel):
    """Local edit available from the currently selected token."""

    direction: Direction
    replacement: str
    label: str
    action: MoveAction = "replace"


class PhonemeToken(BaseModel):
    """Single token in a phoneme string shown to the UI."""

    index: int = Field(ge=0)
    text: str = Field(min_length=1)
    token_type: Literal["phoneme", "separator", "punctuation"]
    token_kind: TokenKind
    is_editable: bool
    candidates: list[CandidateMove] = Field(default_factory=list)


class NavigationSnapshot(BaseModel):
    """Editable representation of a phoneme sequence."""

    phonemes: str
    tokens: list[PhonemeToken]
    selected_index: int | None = Field(default=None, ge=0)
