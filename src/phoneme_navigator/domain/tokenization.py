"""Phoneme string tokenization utilities."""

from __future__ import annotations

from dataclasses import dataclass

from phoneme_navigator.models.phonemes import TokenKind

VOWELS: set[str] = {
    "i",
    "ɪ",
    "e",
    "eɪ",
    "ɛ",
    "æ",
    "a",
    "ɑ",
    "ɒ",
    "ɔ",
    "o",
    "oʊ",
    "ʊ",
    "u",
    "ʌ",
    "ə",
    "ɐ",
    "ɜ",
    "ɝ",
    "ɚ",
    "aɪ",
    "aʊ",
    "ɔɪ",
    "ɪə",
    "eə",
    "ʊə",
    "ɤ",
}
STRESS_MARKS: set[str] = {"ˈ", "ˌ"}
DIACRITICS: set[str] = {"ː", "ˑ", "̃", "̩", "ʰ", "ʲ", "ʷ"}
SEPARATORS: set[str] = {" ", "\t", "\n", ".", ",", "·", "/", "|"}
PUNCTUATION_CHARS = {";", ":", "!", "?", "(", ")", "[", "]"}
MULTI_CHAR_TOKENS: list[str] = sorted(
    [
        "tʃ",
        "dʒ",
        "aɪ",
        "aʊ",
        "ɔɪ",
        "eɪ",
        "oʊ",
        "ɪə",
        "eə",
        "ʊə",
        "ɝ",
        "ɚ",
    ],
    key=len,
    reverse=True,
)


def normalize_phoneme_string(phonemes: str) -> str:
    """Normalize Kokoro phoneme aliases to IPA symbols used by the UI."""
    return phonemes.replace(":", "ː").replace("'", "ˈ")


@dataclass(frozen=True, kw_only=True)
class RawToken:
    """Tokenized segment before conversion to API models."""

    text: str
    token_type: str
    token_kind: TokenKind
    is_editable: bool


def classify_ipa_token(text: str) -> TokenKind:
    """Classify a token into a coarse phonological class."""
    if text in VOWELS:
        return "vowel"
    if text in STRESS_MARKS:
        return "stress"
    if text in DIACRITICS:
        return "diacritic"
    if text in SEPARATORS or text in PUNCTUATION_CHARS:
        return "separator"
    if not text.strip():
        return "separator"
    return "consonant"


def split_phoneme_tokens(phonemes: str) -> list[RawToken]:
    """Tokenise an IPA-like Kokoro phoneme string into editable units."""
    tokens: list[RawToken] = []
    index = 0

    while index < len(phonemes):
        matched: str | None = None
        for candidate in MULTI_CHAR_TOKENS:
            if phonemes.startswith(candidate, index):
                matched = candidate
                break

        if matched is None:
            matched = phonemes[index]

        token_kind = classify_ipa_token(matched)
        if token_kind == "diacritic" and tokens:
            previous = tokens[-1]
            tokens[-1] = RawToken(
                text=previous.text + matched,
                token_type=previous.token_type,
                token_kind=previous.token_kind,
                is_editable=previous.is_editable,
            )
            index += len(matched)
            continue

        token_type = (
            "separator"
            if token_kind == "separator"
            else "punctuation"
            if matched in PUNCTUATION_CHARS
            else "phoneme"
        )
        tokens.append(
            RawToken(
                text=matched,
                token_type=token_type,
                token_kind=token_kind,
                is_editable=token_kind != "separator",
            )
        )
        index += len(matched)

    return tokens
