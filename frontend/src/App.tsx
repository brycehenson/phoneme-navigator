import {
  CSSProperties,
  FormEvent,
  KeyboardEvent,
  PointerEvent,
  Suspense,
  lazy,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState
} from "react";

const Plot = lazy(() => import("react-plotly.js"));

const defaultSpectrogramSettings: SpectrogramSettings = {
  windowMs: 25,
  hopMs: 5,
  topDb: 80,
  maxFrequencyHz: 8000,
  smoothing: 0.75,
  trimSeconds: 0.3
};

type Direction =
  | "up"
  | "down"
  | "left"
  | "right"
  | "up_left"
  | "up_right"
  | "down_left"
  | "down_right";

type MoveAction =
  | "replace"
  | "delete"
  | "insert_stress_before"
  | "insert_copy_before";

type CandidateMove = {
  direction: Direction;
  replacement: string;
  label: string;
  action: MoveAction;
};

type PhonemeToken = {
  index: number;
  text: string;
  token_type: "phoneme" | "separator" | "punctuation";
  token_kind: "vowel" | "consonant" | "stress" | "diacritic" | "separator";
  is_editable: boolean;
  candidates: CandidateMove[];
};

type PhonemizeResponse = {
  input_text: string;
  phonemes: string;
  tokens: PhonemeToken[];
  selected_index: number | null;
};

type VoicesResponse = {
  voices: string[];
};

type SpeechRequest = {
  phonemes: string;
  voice: string;
  speed: number;
};

type SpectrogramResponse = {
  sample_rate_hz: number;
  window_ms: number;
  hop_ms: number;
  top_db: number;
  max_frequency_hz: number;
  times_s: number[];
  frequencies_hz: number[];
  magnitudes_db: number[][];
};

type SpectrogramSettings = {
  windowMs: number;
  hopMs: number;
  topDb: number;
  maxFrequencyHz: number;
  smoothing: number;
  trimSeconds: number;
};

type ProjectionOption = {
  symbol: string;
  label: string;
  tokenKind: "vowel" | "consonant";
  featureX: number;
  featureY: number;
};

type PositionedProjectionOption = ProjectionOption & {
  x: number;
  y: number;
  isSelected: boolean;
};

type ProjectionGuide = {
  id: string;
  label: string;
  angleDeg: number;
  displayAngleDeg: number;
  isFlipped: boolean;
  edgeX: number;
  edgeY: number;
};

type KeyboardConnection = {
  id: string;
  label: string;
  move: CandidateMove;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  midpointX: number;
  midpointY: number;
};

type ProjectionNeighbourConnection = {
  id: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
};

type AnimatedConnectionLineProps = {
  className: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  endpointPadding?: number;
};

type PhonemeInfo = {
  name: string;
  description: string;
  examples: string[];
};

type DragState = {
  tokenIndex: number;
  insertBeforeIndex: number | null;
  isOverTrash: boolean;
};

type TrashDropZoneStyles = Record<"left" | "right", CSSProperties>;

type LanguageOption = {
  value: string;
  label: string;
};

const editableKinds = new Set<PhonemeToken["token_kind"]>([
  "vowel",
  "consonant",
  "stress",
  "diacritic"
]);

const phonemeBoxFallbackSizePx = 48;
const workspacePaddingPx = 18;
const mapAnimationDurationMs = 364;
const mapAnimationEasing = "cubic-bezier(0.22, 1, 0.36, 1)";
const maxProjectionAnimationDistancePx = 360;

const stressableKinds = new Set<PhonemeToken["token_kind"]>([
  "vowel",
  "consonant"
]);

const languageOptions: LanguageOption[] = [
  { value: "a", label: "American English" },
  { value: "b", label: "British English" },
  { value: "e", label: "Spanish" },
  { value: "f", label: "French" },
  { value: "h", label: "Hindi" },
  { value: "i", label: "Italian" },
  { value: "j", label: "Japanese" },
  { value: "p", label: "Brazilian Portuguese" },
  { value: "z", label: "Mandarin Chinese" }
];

const englishConsonantPhonemes = [
  "p",
  "b",
  "t",
  "d",
  "k",
  "g",
  "tʃ",
  "dʒ",
  "f",
  "v",
  "θ",
  "ð",
  "s",
  "z",
  "ʃ",
  "ʒ",
  "h",
  "m",
  "n",
  "ŋ",
  "l",
  "r",
  "j",
  "w"
];

const languagePhonemeInventories: Partial<Record<string, ReadonlySet<string>>> = {
  a: new Set([
    ...englishConsonantPhonemes,
    "i",
    "ɪ",
    "u",
    "ʊ",
    "eɪ",
    "ɛ",
    "ə",
    "ɚ",
    "ɝ",
    "ʌ",
    "æ",
    "ɑ",
    "ɔ",
    "oʊ",
    "aɪ",
    "aʊ",
    "ɔɪ"
  ]),
  b: new Set([
    ...englishConsonantPhonemes,
    "i",
    "ɪ",
    "u",
    "ʊ",
    "e",
    "ə",
    "ɜ",
    "ʌ",
    "ɒ",
    "æ",
    "ɑ",
    "ɔ",
    "eɪ",
    "oʊ",
    "aɪ",
    "aʊ",
    "ɔɪ"
  ])
};

const starterWords = [
  "rough",
  "bright",
  "cloud",
  "garden",
  "jazz",
  "lantern",
  "ocean",
  "puzzle",
  "silver",
  "whisper"
];

const keyboardDirectionLabels: Partial<Record<Direction, string>> = {
  up: "↑",
  down: "↓",
  left: "←",
  right: "→",
  up_left: "W",
  down_left: "A",
  up_right: "D",
  down_right: "S"
};

const vowelProjection: ProjectionOption[] = [
  { symbol: "i", label: "close front", tokenKind: "vowel", featureX: 16, featureY: 15 },
  { symbol: "y", label: "close front rounded", tokenKind: "vowel", featureX: 21, featureY: 15 },
  { symbol: "ɪ", label: "near-close front", tokenKind: "vowel", featureX: 28, featureY: 25 },
  { symbol: "ɨ", label: "close central", tokenKind: "vowel", featureX: 50, featureY: 15 },
  { symbol: "ɯ", label: "close back unrounded", tokenKind: "vowel", featureX: 79, featureY: 15 },
  { symbol: "u", label: "close back rounded", tokenKind: "vowel", featureX: 84, featureY: 15 },
  { symbol: "ʊ", label: "near-close back", tokenKind: "vowel", featureX: 74, featureY: 27 },
  { symbol: "e", label: "close-mid front", tokenKind: "vowel", featureX: 23, featureY: 37 },
  { symbol: "ø", label: "close-mid front rounded", tokenKind: "vowel", featureX: 28, featureY: 37 },
  { symbol: "ɵ", label: "close-mid central rounded", tokenKind: "vowel", featureX: 50, featureY: 37 },
  { symbol: "ɤ", label: "close-mid back unrounded", tokenKind: "vowel", featureX: 68, featureY: 37 },
  { symbol: "o", label: "close-mid back rounded", tokenKind: "vowel", featureX: 76, featureY: 37 },
  { symbol: "eɪ", label: "front closing diphthong", tokenKind: "vowel", featureX: 36, featureY: 37 },
  { symbol: "ɜ", label: "open-mid central", tokenKind: "vowel", featureX: 50, featureY: 45 },
  { symbol: "ɝ", label: "r-coloured central", tokenKind: "vowel", featureX: 58, featureY: 43 },
  { symbol: "oʊ", label: "back closing diphthong", tokenKind: "vowel", featureX: 69, featureY: 38 },
  { symbol: "ɔ", label: "open-mid back rounded", tokenKind: "vowel", featureX: 79, featureY: 48 },
  { symbol: "ɛ", label: "open-mid front", tokenKind: "vowel", featureX: 28, featureY: 55 },
  { symbol: "œ", label: "open-mid front rounded", tokenKind: "vowel", featureX: 33, featureY: 55 },
  { symbol: "ɞ", label: "open-mid central rounded", tokenKind: "vowel", featureX: 55, featureY: 55 },
  { symbol: "ə", label: "schwa", tokenKind: "vowel", featureX: 50, featureY: 58 },
  { symbol: "ɚ", label: "r-coloured schwa", tokenKind: "vowel", featureX: 60, featureY: 58 },
  { symbol: "ʌ", label: "strut vowel", tokenKind: "vowel", featureX: 62, featureY: 66 },
  { symbol: "ɒ", label: "open back rounded", tokenKind: "vowel", featureX: 78, featureY: 72 },
  { symbol: "æ", label: "near-open front", tokenKind: "vowel", featureX: 30, featureY: 77 },
  { symbol: "ɐ", label: "near-open central", tokenKind: "vowel", featureX: 51, featureY: 80 },
  { symbol: "a", label: "open front", tokenKind: "vowel", featureX: 36, featureY: 88 },
  { symbol: "ɶ", label: "open front rounded", tokenKind: "vowel", featureX: 41, featureY: 88 },
  { symbol: "ɑ", label: "open back", tokenKind: "vowel", featureX: 68, featureY: 88 },
  { symbol: "aɪ", label: "price diphthong", tokenKind: "vowel", featureX: 21, featureY: 88 },
  { symbol: "aʊ", label: "mouth diphthong", tokenKind: "vowel", featureX: 82, featureY: 88 },
  { symbol: "ɔɪ", label: "choice diphthong", tokenKind: "vowel", featureX: 87, featureY: 61 }
];

const vowelNeighbourPairs: [string, string][] = [
  ["i", "ɪ"],
  ["i", "y"],
  ["y", "ɨ"],
  ["ɪ", "e"],
  ["ɨ", "ɯ"],
  ["ɯ", "u"],
  ["u", "ʊ"],
  ["e", "ɛ"],
  ["e", "ø"],
  ["ø", "ə"],
  ["e", "eɪ"],
  ["eɪ", "ɜ"],
  ["ɜ", "ə"],
  ["ɜ", "ɞ"],
  ["ɜ", "oʊ"],
  ["ə", "ɵ"],
  ["ɵ", "ɤ"],
  ["ɤ", "o"],
  ["ɤ", "ʊ"],
  ["oʊ", "ɔ"],
  ["ʊ", "oʊ"],
  ["ɛ", "æ"],
  ["ɛ", "œ"],
  ["œ", "ɜ"],
  ["ɛ", "ə"],
  ["ə", "ɚ"],
  ["ə", "ɐ"],
  ["ɚ", "ʌ"],
  ["ɞ", "ʌ"],
  ["ʌ", "ɑ"],
  ["ɔ", "ɒ"],
  ["ɒ", "ɑ"],
  ["æ", "a"],
  ["ɐ", "a"],
  ["a", "ɶ"],
  ["ɶ", "ɑ"],
  ["ɐ", "ɑ"],
  ["ɑ", "aʊ"],
  ["ɔ", "ɔɪ"]
];

const consonantProjection: ProjectionOption[] = [
  { symbol: "p", label: "voiceless bilabial stop", tokenKind: "consonant", featureX: 12, featureY: 20 },
  { symbol: "b", label: "voiced bilabial stop", tokenKind: "consonant", featureX: 12, featureY: 32 },
  { symbol: "m", label: "bilabial nasal", tokenKind: "consonant", featureX: 12, featureY: 44 },
  { symbol: "f", label: "voiceless labiodental fricative", tokenKind: "consonant", featureX: 20, featureY: 61 },
  { symbol: "v", label: "voiced labiodental fricative", tokenKind: "consonant", featureX: 20, featureY: 73 },
  { symbol: "θ", label: "voiceless dental fricative", tokenKind: "consonant", featureX: 30, featureY: 61 },
  { symbol: "ð", label: "voiced dental fricative", tokenKind: "consonant", featureX: 30, featureY: 73 },
  { symbol: "t", label: "voiceless alveolar stop", tokenKind: "consonant", featureX: 43, featureY: 20 },
  { symbol: "d", label: "voiced alveolar stop", tokenKind: "consonant", featureX: 43, featureY: 32 },
  { symbol: "n", label: "alveolar nasal", tokenKind: "consonant", featureX: 43, featureY: 44 },
  { symbol: "s", label: "voiceless alveolar fricative", tokenKind: "consonant", featureX: 43, featureY: 61 },
  { symbol: "z", label: "voiced alveolar fricative", tokenKind: "consonant", featureX: 43, featureY: 73 },
  { symbol: "l", label: "alveolar lateral", tokenKind: "consonant", featureX: 43, featureY: 88 },
  { symbol: "r", label: "alveolar approximant", tokenKind: "consonant", featureX: 52, featureY: 88 },
  { symbol: "ʃ", label: "voiceless postalveolar fricative", tokenKind: "consonant", featureX: 57, featureY: 61 },
  { symbol: "ʒ", label: "voiced postalveolar fricative", tokenKind: "consonant", featureX: 57, featureY: 73 },
  { symbol: "tʃ", label: "voiceless postalveolar affricate", tokenKind: "consonant", featureX: 57, featureY: 20 },
  { symbol: "dʒ", label: "voiced postalveolar affricate", tokenKind: "consonant", featureX: 57, featureY: 32 },
  { symbol: "j", label: "palatal approximant", tokenKind: "consonant", featureX: 67, featureY: 88 },
  { symbol: "k", label: "voiceless velar stop", tokenKind: "consonant", featureX: 76, featureY: 20 },
  { symbol: "g", label: "voiced velar stop", tokenKind: "consonant", featureX: 76, featureY: 32 },
  { symbol: "ŋ", label: "velar nasal", tokenKind: "consonant", featureX: 76, featureY: 44 },
  { symbol: "x", label: "voiceless velar fricative", tokenKind: "consonant", featureX: 76, featureY: 61 },
  { symbol: "ɣ", label: "voiced velar fricative", tokenKind: "consonant", featureX: 76, featureY: 73 },
  { symbol: "w", label: "labial-velar approximant", tokenKind: "consonant", featureX: 86, featureY: 88 },
  { symbol: "h", label: "glottal fricative", tokenKind: "consonant", featureX: 92, featureY: 61 }
];

const consonantNeighbourPairs: [string, string][] = [
  ["p", "b"],
  ["t", "d"],
  ["k", "g"],
  ["f", "v"],
  ["θ", "ð"],
  ["s", "z"],
  ["ʃ", "ʒ"],
  ["tʃ", "dʒ"],
  ["x", "ɣ"],
  ["p", "m"],
  ["b", "m"],
  ["t", "n"],
  ["d", "n"],
  ["k", "ŋ"],
  ["g", "ŋ"],
  ["f", "θ"],
  ["v", "ð"],
  ["θ", "s"],
  ["ð", "z"],
  ["s", "ʃ"],
  ["z", "ʒ"],
  ["ʃ", "x"],
  ["ʒ", "ɣ"],
  ["p", "t"],
  ["b", "d"],
  ["t", "k"],
  ["d", "g"],
  ["m", "n"],
  ["n", "ŋ"],
  ["tʃ", "ʃ"],
  ["dʒ", "ʒ"],
  ["l", "r"],
  ["r", "j"],
  ["j", "w"],
  ["x", "h"]
];

const americanEnglishVowelNeighbourPairs: [string, string][] = [
  ["i", "ɪ"],
  ["i", "eɪ"],
  ["ɪ", "ɛ"],
  ["eɪ", "ɛ"],
  ["ɛ", "æ"],
  ["æ", "aɪ"],
  ["æ", "ɑ"],
  ["ɑ", "ʌ"],
  ["ʌ", "ə"],
  ["ə", "ɚ"],
  ["ɚ", "ɝ"],
  ["ɝ", "ɔ"],
  ["ɔ", "oʊ"],
  ["oʊ", "u"],
  ["u", "ʊ"],
  ["ʊ", "oʊ"],
  ["ɔ", "ɔɪ"],
  ["ɔɪ", "aʊ"],
  ["ɑ", "aʊ"],
  ["aɪ", "aʊ"]
];

const britishEnglishVowelNeighbourPairs: [string, string][] = [
  ["i", "ɪ"],
  ["i", "eɪ"],
  ["ɪ", "e"],
  ["eɪ", "e"],
  ["e", "æ"],
  ["æ", "aɪ"],
  ["æ", "ɑ"],
  ["ɑ", "ʌ"],
  ["ʌ", "ə"],
  ["ə", "ɜ"],
  ["ɜ", "ɔ"],
  ["ɔ", "oʊ"],
  ["ɔ", "ɒ"],
  ["ɒ", "ɑ"],
  ["oʊ", "u"],
  ["u", "ʊ"],
  ["ʊ", "oʊ"],
  ["ɔ", "ɔɪ"],
  ["ɔɪ", "aʊ"],
  ["ɑ", "aʊ"],
  ["aɪ", "aʊ"]
];

const englishConsonantNeighbourPairs: [string, string][] = [
  ["p", "b"],
  ["t", "d"],
  ["k", "g"],
  ["f", "v"],
  ["θ", "ð"],
  ["s", "z"],
  ["ʃ", "ʒ"],
  ["tʃ", "dʒ"],
  ["p", "m"],
  ["b", "m"],
  ["t", "n"],
  ["d", "n"],
  ["k", "ŋ"],
  ["g", "ŋ"],
  ["f", "θ"],
  ["v", "ð"],
  ["θ", "s"],
  ["ð", "z"],
  ["s", "ʃ"],
  ["z", "ʒ"],
  ["p", "t"],
  ["b", "d"],
  ["t", "k"],
  ["d", "g"],
  ["m", "n"],
  ["n", "ŋ"],
  ["tʃ", "ʃ"],
  ["dʒ", "ʒ"],
  ["l", "r"],
  ["r", "j"],
  ["j", "w"]
];

const languageNeighbourPairs: Partial<
  Record<
    string,
    Partial<Record<ProjectionOption["tokenKind"], [string, string][]>>
  >
> = {
  a: {
    vowel: americanEnglishVowelNeighbourPairs,
    consonant: englishConsonantNeighbourPairs
  },
  b: {
    vowel: britishEnglishVowelNeighbourPairs,
    consonant: englishConsonantNeighbourPairs
  }
};

const phonemeInfo: Record<string, PhonemeInfo> = {
  i: {
    name: "close front vowel",
    description: "A high, front vowel with the tongue close to the roof of the mouth.",
    examples: ["like EE in fleece", "like the vowel in see"]
  },
  y: {
    name: "close front rounded vowel",
    description: "A high front vowel made with rounded lips.",
    examples: ["like French U in tu", "symbol: y"]
  },
  "ɪ": {
    name: "near-close front vowel",
    description: "A short, relaxed front vowel.",
    examples: ["like I in kit", "like the vowel in sit"]
  },
  "ɨ": {
    name: "close central vowel",
    description: "A high central vowel made between the front and back of the mouth.",
    examples: ["symbol: ɨ"]
  },
  "ɯ": {
    name: "close back unrounded vowel",
    description: "A high back vowel made without lip rounding.",
    examples: ["symbol: ɯ"]
  },
  e: {
    name: "close-mid front vowel",
    description: "A tense front vowel between /i/ and /ɛ/.",
    examples: ["like the first part of AY in face"]
  },
  "ø": {
    name: "close-mid front rounded vowel",
    description: "A close-mid front vowel made with rounded lips.",
    examples: ["like French EU in deux", "symbol: ø"]
  },
  "ɵ": {
    name: "close-mid central rounded vowel",
    description: "A close-mid central vowel made with rounded lips.",
    examples: ["symbol: ɵ"]
  },
  "ɤ": {
    name: "close-mid back unrounded vowel",
    description: "A close-mid back vowel made without lip rounding.",
    examples: ["symbol: ɤ"]
  },
  o: {
    name: "close-mid back rounded vowel",
    description: "A close-mid back vowel made with rounded lips.",
    examples: ["like pure O in many languages", "symbol: o"]
  },
  "eɪ": {
    name: "face diphthong",
    description: "A glide that starts around /e/ and moves toward /ɪ/.",
    examples: ["like A in face", "like AY in say"]
  },
  "ɛ": {
    name: "open-mid front vowel",
    description: "A front vowel more open than /e/.",
    examples: ["like E in dress", "like the vowel in bed"]
  },
  "œ": {
    name: "open-mid front rounded vowel",
    description: "An open-mid front vowel made with rounded lips.",
    examples: ["like French EU in jeune", "symbol: œ"]
  },
  "ɞ": {
    name: "open-mid central rounded vowel",
    description: "An open-mid central vowel made with rounded lips.",
    examples: ["symbol: ɞ"]
  },
  "æ": {
    name: "near-open front vowel",
    description: "A low front vowel common in many English short-A words.",
    examples: ["like A in apple", "like the vowel in cat"]
  },
  "ɶ": {
    name: "open front rounded vowel",
    description: "A low front vowel made with rounded lips.",
    examples: ["symbol: ɶ"]
  },
  a: {
    name: "open front vowel",
    description: "A low, open vowel made toward the front of the mouth.",
    examples: ["like A in spa for some accents"]
  },
  "ɑ": {
    name: "open back vowel",
    description: "A low back vowel with an open mouth shape.",
    examples: ["like A in father", "like the vowel in palm"]
  },
  "ɒ": {
    name: "open back rounded vowel",
    description: "A low back rounded vowel used in some British English accents.",
    examples: ["like O in lot in many UK accents"]
  },
  "ɔ": {
    name: "open-mid back rounded vowel",
    description: "A rounded back vowel more open than /o/.",
    examples: ["like AW in thought for many accents"]
  },
  "oʊ": {
    name: "goat diphthong",
    description: "A back rounded glide that moves toward /ʊ/.",
    examples: ["like O in goat", "like the vowel in no"]
  },
  "ʊ": {
    name: "near-close back rounded vowel",
    description: "A short, relaxed rounded vowel.",
    examples: ["like OO in foot", "like the vowel in good"]
  },
  u: {
    name: "close back rounded vowel",
    description: "A high rounded vowel made toward the back of the mouth.",
    examples: ["like OO in goose", "like the vowel in blue"]
  },
  "ʌ": {
    name: "open-mid central vowel",
    description: "A central vowel used in stressed syllables in many English accents.",
    examples: ["like U in strut", "like the vowel in rough"]
  },
  "ə": {
    name: "schwa",
    description: "A reduced, unstressed central vowel.",
    examples: ["like A in about", "like the final vowel in sofa"]
  },
  "ɚ": {
    name: "r-coloured schwa",
    description: "A reduced central vowel with r-colouring.",
    examples: ["like ER in butter in American English"]
  },
  "ɜ": {
    name: "open-mid central vowel",
    description: "A central vowel often associated with nurse-type vowels.",
    examples: ["like UR in nurse for some accents"]
  },
  "ɝ": {
    name: "r-coloured central vowel",
    description: "A stressed central vowel with r-colouring.",
    examples: ["like ER in bird in American English"]
  },
  "ɐ": {
    name: "near-open central vowel",
    description: "A low central vowel between schwa-like and open vowels.",
    examples: ["like a more open schwa"]
  },
  "aɪ": {
    name: "price diphthong",
    description: "A glide from an open vowel toward /ɪ/.",
    examples: ["like I in price", "like the vowel in my"]
  },
  "aʊ": {
    name: "mouth diphthong",
    description: "A glide from an open vowel toward /ʊ/.",
    examples: ["like OU in mouth", "like the vowel in now"]
  },
  "ɔɪ": {
    name: "choice diphthong",
    description: "A glide from a rounded back vowel toward /ɪ/.",
    examples: ["like OY in choice", "like the vowel in boy"]
  },
  p: {
    name: "voiceless bilabial stop",
    description: "Both lips close, then release without vocal-fold vibration.",
    examples: ["like P in pin", "like the final sound in cup"]
  },
  b: {
    name: "voiced bilabial stop",
    description: "Both lips close, then release with voicing.",
    examples: ["like B in bat", "like the final sound in cab"]
  },
  m: {
    name: "bilabial nasal",
    description: "Both lips close while air flows through the nose.",
    examples: ["like M in mat", "like the final sound in team"]
  },
  f: {
    name: "voiceless labiodental fricative",
    description: "Air passes between the lower lip and upper teeth without voicing.",
    examples: ["like F in fan", "like PH in phone"]
  },
  v: {
    name: "voiced labiodental fricative",
    description: "Air passes between the lower lip and upper teeth with voicing.",
    examples: ["like V in van", "like the final sound in save"]
  },
  "θ": {
    name: "voiceless dental fricative",
    description: "Air passes around the tongue at the teeth without voicing.",
    examples: ["like TH in thin", "like the final sound in bath"]
  },
  "ð": {
    name: "voiced dental fricative",
    description: "Air passes around the tongue at the teeth with voicing.",
    examples: ["like TH in this", "like the sound in mother"]
  },
  t: {
    name: "voiceless alveolar stop",
    description: "The tongue closes at the alveolar ridge, then releases without voicing.",
    examples: ["like T in top", "like the final sound in cat"]
  },
  d: {
    name: "voiced alveolar stop",
    description: "The tongue closes at the alveolar ridge, then releases with voicing.",
    examples: ["like D in dog", "like the final sound in bed"]
  },
  n: {
    name: "alveolar nasal",
    description: "The tongue closes at the alveolar ridge while air flows through the nose.",
    examples: ["like N in no", "like the final sound in sun"]
  },
  s: {
    name: "voiceless alveolar fricative",
    description: "A hissing fricative made without vocal-fold vibration.",
    examples: ["like S in sip", "like C in city"]
  },
  z: {
    name: "voiced alveolar fricative",
    description: "A hissing fricative made with vocal-fold vibration.",
    examples: ["like Z in zoo", "like S in rose"]
  },
  l: {
    name: "alveolar lateral approximant",
    description: "The tongue contacts near the alveolar ridge while air flows around the sides.",
    examples: ["like L in leaf", "like the final sound in feel"]
  },
  r: {
    name: "alveolar approximant",
    description: "An English r-like approximant, with a narrowed but not blocked vocal tract.",
    examples: ["like R in red", "like the sound in around"]
  },
  "ʃ": {
    name: "voiceless postalveolar fricative",
    description: "A hush-like fricative made just behind the alveolar ridge.",
    examples: ["like SH in ship", "like TI in nation"]
  },
  "ʒ": {
    name: "voiced postalveolar fricative",
    description: "The voiced counterpart of /ʃ/.",
    examples: ["like S in measure", "like SI in vision"]
  },
  "tʃ": {
    name: "voiceless postalveolar affricate",
    description: "A stop release into a /ʃ/-like fricative.",
    examples: ["like CH in chip", "like TCH in match"]
  },
  "dʒ": {
    name: "voiced postalveolar affricate",
    description: "A stop release into a /ʒ/-like fricative.",
    examples: ["like J in judge", "like G in gem"]
  },
  j: {
    name: "palatal approximant",
    description: "A y-like glide made near the hard palate.",
    examples: ["like Y in yes", "like the first sound in use for many accents"]
  },
  k: {
    name: "voiceless velar stop",
    description: "The back of the tongue closes at the soft palate, then releases without voicing.",
    examples: ["like K in kit", "like C in cat"]
  },
  g: {
    name: "voiced velar stop",
    description: "The back of the tongue closes at the soft palate, then releases with voicing.",
    examples: ["like G in go", "like the final sound in bag"]
  },
  "ŋ": {
    name: "velar nasal",
    description: "The back of the tongue closes at the soft palate while air flows through the nose.",
    examples: ["like NG in sing", "like the final sound in thing"]
  },
  w: {
    name: "labial-velar approximant",
    description: "A rounded glide made with lip rounding and tongue backing.",
    examples: ["like W in we", "like the first sound in one for many accents"]
  },
  h: {
    name: "glottal fricative",
    description: "A breathy sound made at the glottis.",
    examples: ["like H in hat", "like the first sound in ahead"]
  }
};

function joinTokens(tokens: PhonemeToken[]): string {
  return tokens.map((token) => token.text).join("");
}

function firstEditableIndex(tokens: PhonemeToken[]): number | null {
  const token = tokens.find((candidate) => candidate.is_editable);
  return token ? token.index : null;
}

function recomputeIndices(tokens: PhonemeToken[]): PhonemeToken[] {
  return tokens.map((token, index) => ({ ...token, index }));
}

function basePhonemeText(text: string): string {
  return text.replace(/ː/g, "");
}

function applyMove(
  tokens: PhonemeToken[],
  selectedIndex: number,
  move: CandidateMove
): string {
  const current = [...tokens];
  const selected = current[selectedIndex];
  if (!selected) {
    return joinTokens(tokens);
  }

  if (move.action === "replace") {
    current[selectedIndex] = { ...selected, text: move.replacement };
  } else if (move.action === "delete") {
    current.splice(selectedIndex, 1);
  } else if (move.action === "insert_stress_before") {
    current.splice(selectedIndex, 0, {
      ...selected,
      index: selectedIndex,
      text: "ˈ",
      token_kind: "stress",
      token_type: "phoneme",
      candidates: []
    });
  } else if (move.action === "insert_copy_before") {
    current.splice(selectedIndex, 0, { ...selected, index: selectedIndex });
  }

  return joinTokens(recomputeIndices(current));
}

function leadingStress(tokens: PhonemeToken[], tokenIndex: number): "ˈ" | "ˌ" | null {
  const previousToken = tokens[tokenIndex - 1];
  return previousToken?.token_kind === "stress" &&
    (previousToken.text === "ˈ" || previousToken.text === "ˌ")
    ? previousToken.text
    : null;
}

function stressLabel(stress: "ˈ" | "ˌ" | null): string {
  return stress ?? "–";
}

function hasLongMark(token: PhonemeToken): boolean {
  return token.token_kind === "vowel" && token.text.includes("ː");
}

function toggleLengthMark(
  tokens: PhonemeToken[],
  tokenIndex: number
): { phonemes: string; selectedIndex: number } {
  const current = [...tokens];
  const selected = current[tokenIndex];
  if (!selected || selected.token_kind !== "vowel") {
    return { phonemes: joinTokens(tokens), selectedIndex: tokenIndex };
  }

  current[tokenIndex] = {
    ...selected,
    text: hasLongMark(selected) ? basePhonemeText(selected.text) : `${selected.text}ː`
  };
  return {
    phonemes: joinTokens(recomputeIndices(current)),
    selectedIndex: tokenIndex
  };
}

function toggleLeadingStress(
  tokens: PhonemeToken[],
  tokenIndex: number
): { phonemes: string; selectedIndex: number } {
  const current = [...tokens];
  const selected = current[tokenIndex];
  if (!selected) {
    return { phonemes: joinTokens(tokens), selectedIndex: tokenIndex };
  }

  const currentStress = leadingStress(current, tokenIndex);
  if (currentStress === null) {
    current.splice(tokenIndex, 0, {
      ...selected,
      index: tokenIndex,
      text: "ˈ",
      token_kind: "stress",
      token_type: "phoneme",
      candidates: []
    });
    return {
      phonemes: joinTokens(recomputeIndices(current)),
      selectedIndex: tokenIndex + 1
    };
  }

  if (currentStress === "ˈ") {
    current[tokenIndex - 1] = { ...current[tokenIndex - 1], text: "ˌ" };
    return {
      phonemes: joinTokens(recomputeIndices(current)),
      selectedIndex: tokenIndex
    };
  }

  current.splice(tokenIndex - 1, 1);
  return {
    phonemes: joinTokens(recomputeIndices(current)),
    selectedIndex: tokenIndex - 1
  };
}

function tokenWithLeadingStress(tokens: PhonemeToken[], tokenIndex: number): PhonemeToken[] {
  const previousToken = tokens[tokenIndex - 1];
  return previousToken?.token_kind === "stress"
    ? [previousToken, tokens[tokenIndex]]
    : [tokens[tokenIndex]];
}

function moveTokenGroup(
  tokens: PhonemeToken[],
  tokenIndex: number,
  insertBeforeIndex: number | null
): { phonemes: string; selectedIndex: number } {
  const movingIndices = new Set(
    tokenWithLeadingStress(tokens, tokenIndex).map((token) => token.index)
  );
  if (insertBeforeIndex !== null && movingIndices.has(insertBeforeIndex)) {
    return { phonemes: joinTokens(tokens), selectedIndex: tokenIndex };
  }

  const movingTokens = tokens.filter((token) => movingIndices.has(token.index));
  const remainingTokens = tokens.filter((token) => !movingIndices.has(token.index));
  let insertionPosition = remainingTokens.length;
  if (insertBeforeIndex !== null) {
    insertionPosition = remainingTokens.findIndex(
      (token) => token.index === insertBeforeIndex
    );
    if (insertionPosition === -1) {
      return { phonemes: joinTokens(tokens), selectedIndex: tokenIndex };
    }
  }

  const nextTokens = [
    ...remainingTokens.slice(0, insertionPosition),
    ...movingTokens,
    ...remainingTokens.slice(insertionPosition)
  ];
  const selectedOffset = movingTokens.findIndex((token) => token.index === tokenIndex);
  return {
    phonemes: joinTokens(recomputeIndices(nextTokens)),
    selectedIndex: insertionPosition + Math.max(selectedOffset, 0)
  };
}

function nearestEditableSelection(
  tokens: PhonemeToken[],
  preferredIndex: number
): number | null {
  if (tokens.length === 0) {
    return null;
  }

  const samePosition = tokens[preferredIndex];
  if (samePosition?.is_editable) {
    return samePosition.index;
  }

  const previousEditable = nextEditableIndex(tokens, preferredIndex, -1);
  if (previousEditable !== preferredIndex) {
    return previousEditable;
  }

  const nextEditable = nextEditableIndex(tokens, preferredIndex - 1, 1);
  return nextEditable === preferredIndex - 1 ? firstEditableIndex(tokens) : nextEditable;
}

function deleteTokenGroup(
  tokens: PhonemeToken[],
  tokenIndex: number
): { phonemes: string; selectedIndex: number | null } {
  const removingIndices = new Set(
    tokenWithLeadingStress(tokens, tokenIndex).map((token) => token.index)
  );
  const nextTokens = recomputeIndices(
    tokens.filter((token) => !removingIndices.has(token.index))
  );

  return {
    phonemes: joinTokens(nextTokens),
    selectedIndex: nearestEditableSelection(nextTokens, tokenIndex)
  };
}

function removeMarkOrDeleteToken(
  tokens: PhonemeToken[],
  tokenIndex: number
): { phonemes: string; selectedIndex: number | null } {
  const selected = tokens[tokenIndex];
  if (!selected) {
    return { phonemes: joinTokens(tokens), selectedIndex: tokenIndex };
  }

  const previousToken = tokens[tokenIndex - 1];
  if (previousToken?.token_kind === "stress") {
    const nextTokens = recomputeIndices(
      tokens.filter((token) => token.index !== previousToken.index)
    );
    return {
      phonemes: joinTokens(nextTokens),
      selectedIndex: Math.max(0, tokenIndex - 1)
    };
  }

  if (hasLongMark(selected)) {
    const nextTokens = [...tokens];
    nextTokens[tokenIndex] = {
      ...selected,
      text: basePhonemeText(selected.text)
    };
    return {
      phonemes: joinTokens(recomputeIndices(nextTokens)),
      selectedIndex: tokenIndex
    };
  }

  return deleteTokenGroup(tokens, tokenIndex);
}

function insertToken(
  tokens: PhonemeToken[],
  text: string,
  tokenKind: "vowel" | "consonant"
): { phonemes: string; selectedIndex: number } {
  const nextTokens = [...tokens, {
    index: tokens.length,
    text,
    token_type: "phoneme" as const,
    token_kind: tokenKind,
    is_editable: true,
    candidates: []
  }];
  return {
    phonemes: joinTokens(recomputeIndices(nextTokens)),
    selectedIndex: nextTokens.length - 1
  };
}

function nextEditableIndex(
  tokens: PhonemeToken[],
  selectedIndex: number | null,
  step: 1 | -1
): number | null {
  if (selectedIndex === null) {
    return firstEditableIndex(tokens);
  }

  let cursor = selectedIndex + step;
  while (cursor >= 0 && cursor < tokens.length) {
    if (tokens[cursor].is_editable) {
      return cursor;
    }
    cursor += step;
  }
  return selectedIndex;
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(Math.max(value, minimum), maximum);
}

function cubicBezierProgress(
  progress: number,
  controlX1: number,
  controlY1: number,
  controlX2: number,
  controlY2: number
): number {
  const sampleCurve = (first: number, second: number, time: number) => {
    const inverseTime = 1 - time;
    return (
      3 * inverseTime * inverseTime * time * first +
      3 * inverseTime * time * time * second +
      time * time * time
    );
  };
  const sampleCurveDerivative = (first: number, second: number, time: number) => {
    const inverseTime = 1 - time;
    return (
      3 * inverseTime * inverseTime * first +
      6 * inverseTime * time * (second - first) +
      3 * time * time * (1 - second)
    );
  };

  let time = progress;
  for (let iteration = 0; iteration < 5; iteration += 1) {
    const currentX = sampleCurve(controlX1, controlX2, time) - progress;
    const derivative = sampleCurveDerivative(controlX1, controlX2, time);
    if (Math.abs(currentX) < 0.00001 || derivative === 0) {
      break;
    }
    time = clamp(time - currentX / derivative, 0, 1);
  }

  return sampleCurve(controlY1, controlY2, time);
}

function positionProjectionOptions(
  options: ProjectionOption[],
  selectedSymbol: string
): PositionedProjectionOption[] {
  const selected =
    options.find((option) => option.symbol === selectedSymbol) ?? options[0];
  if (!selected) {
    return [];
  }

  const neighbours = options
    .filter((option) => option.symbol !== selected.symbol)
    .map((option) => {
      const dx = option.featureX - selected.featureX;
      const dy = option.featureY - selected.featureY;
      return {
        option,
        dx,
        dy,
        distance: Math.hypot(dx, dy),
        angle: Math.atan2(dy, dx)
      };
    });

  if (neighbours.length === 0) {
    return [{ ...selected, x: 50, y: 50, isSelected: true }];
  }

  const angularNeighbours = [...neighbours].sort(
    (left, right) => left.angle - right.angle
  );
  const largestGapStart = angularNeighbours.reduce((largestIndex, neighbour, index) => {
    const next = angularNeighbours[(index + 1) % angularNeighbours.length];
    const gap =
      index === angularNeighbours.length - 1
        ? next.angle + Math.PI * 2 - neighbour.angle
        : next.angle - neighbour.angle;
    const largestNeighbour = angularNeighbours[largestIndex];
    const largestNext =
      angularNeighbours[(largestIndex + 1) % angularNeighbours.length];
    const largestGap =
      largestIndex === angularNeighbours.length - 1
        ? largestNext.angle + Math.PI * 2 - largestNeighbour.angle
        : largestNext.angle - largestNeighbour.angle;
    return gap > largestGap ? index : largestIndex;
  }, 0);
  const ordered = [
    ...angularNeighbours.slice(largestGapStart + 1),
    ...angularNeighbours.slice(0, largestGapStart + 1)
  ];
  const maxDistance = Math.max(...ordered.map((neighbour) => neighbour.distance), 1);
  const maxAbsDx = Math.max(...neighbours.map((neighbour) => Math.abs(neighbour.dx)), 1);
  const maxAbsDy = Math.max(...neighbours.map((neighbour) => Math.abs(neighbour.dy)), 1);
  const positioned = ordered.map((neighbour, index) => {
    const splayAngle = -Math.PI / 2 + (index / ordered.length) * Math.PI * 2;
    const distanceRatio = neighbour.distance / maxDistance;
    const globalX = (neighbour.dx / maxAbsDx) * 31;
    const globalY = (neighbour.dy / maxAbsDy) * 28;
    const splayRadius = 8 + Math.sqrt(distanceRatio) * 12;
    let xOffset = globalX + Math.cos(splayAngle) * splayRadius;
    let yOffset = globalY + Math.sin(splayAngle) * splayRadius;
    const currentRadius = Math.hypot(xOffset, yOffset);
    const expandedRadius = 20 + Math.sqrt(distanceRatio) * 26;
    const radiusScale =
      currentRadius > 0 ? 1 + (expandedRadius / currentRadius - 1) * 0.5 : 1;
    xOffset *= radiusScale;
    yOffset *= radiusScale;
    return {
      ...neighbour.option,
      x: clamp(50 + xOffset, 8, 92),
      y: clamp(50 + yOffset, 10, 90),
      isSelected: false
    };
  });

  return [{ ...selected, x: 50, y: 50, isSelected: true }, ...positioned];
}

function projectionOptionsForLanguage(
  options: ProjectionOption[],
  language: string,
  selectedSymbol: string,
  shouldRestrict: boolean
): ProjectionOption[] {
  const inventory = languagePhonemeInventories[language];
  if (!shouldRestrict || !inventory) {
    return options;
  }

  return options.filter(
    (option) => option.symbol === selectedSymbol || inventory.has(option.symbol)
  );
}

function positionFixedProjectionOptions(
  options: ProjectionOption[],
  selectedSymbol: string
): PositionedProjectionOption[] {
  return options.map((option) => ({
    ...option,
    x: option.featureX,
    y: option.featureY,
    isSelected: option.symbol === selectedSymbol
  }));
}

function projectionEdgePoint(angleDeg: number): { x: number; y: number } {
  const edgeMinimum = 7;
  const edgeMaximum = 93;
  const angleRadians = (angleDeg * Math.PI) / 180;
  const dx = Math.cos(angleRadians);
  const dy = Math.sin(angleRadians);
  const edgeDistanceX =
    dx >= 0 ? (edgeMaximum - 50) / dx : (edgeMinimum - 50) / dx;
  const edgeDistanceY =
    dy >= 0 ? (edgeMaximum - 50) / dy : (edgeMinimum - 50) / dy;
  const edgeDistance = Math.min(
    Number.isFinite(edgeDistanceX) ? edgeDistanceX : Number.POSITIVE_INFINITY,
    Number.isFinite(edgeDistanceY) ? edgeDistanceY : Number.POSITIVE_INFINITY
  );

  return {
    x: clamp(50 + dx * edgeDistance, edgeMinimum, edgeMaximum),
    y: clamp(50 + dy * edgeDistance, edgeMinimum, edgeMaximum)
  };
}

function readableGuideRotation(angleDeg: number): {
  displayAngleDeg: number;
  isFlipped: boolean;
} {
  const normalizedAngle = ((angleDeg + 180) % 360) - 180;
  const isFlipped = normalizedAngle > 90 || normalizedAngle < -90;
  return {
    displayAngleDeg: isFlipped ? normalizedAngle + 180 : normalizedAngle,
    isFlipped
  };
}

function projectionGuide(
  options: PositionedProjectionOption[],
  selected: PositionedProjectionOption,
  id: string,
  label: string,
  score: (option: PositionedProjectionOption) => number
): ProjectionGuide | null {
  const vector = options.reduce(
    (current, option) => {
      if (option.symbol === selected.symbol) {
        return current;
      }
      const weight = score(option);
      if (weight <= 0) {
        return current;
      }
      return {
        x: current.x + (option.x - selected.x) * weight,
        y: current.y + (option.y - selected.y) * weight
      };
    },
    { x: 0, y: 0 }
  );
  const magnitude = Math.hypot(vector.x, vector.y);
  if (magnitude < 0.5) {
    return null;
  }

  const angleDeg = (Math.atan2(vector.y, vector.x) * 180) / Math.PI;
  const rotation = readableGuideRotation(angleDeg);
  const edgePoint = projectionEdgePoint(angleDeg);
  return {
    id,
    label,
    angleDeg,
    displayAngleDeg: rotation.displayAngleDeg,
    isFlipped: rotation.isFlipped,
    edgeX: edgePoint.x,
    edgeY: edgePoint.y
  };
}

function localProjectionGuides(
  options: PositionedProjectionOption[]
): ProjectionGuide[] {
  const selected = options.find((option) => option.isSelected);
  if (!selected) {
    return [];
  }

  const conceptGuides =
    selected.tokenKind === "vowel"
      ? [
          projectionGuide(
            options,
            selected,
            "closer",
            "closer",
            (option) => selected.featureY - option.featureY
          ),
          projectionGuide(
            options,
            selected,
            "more-open",
            "more open",
            (option) => option.featureY - selected.featureY
          ),
          projectionGuide(
            options,
            selected,
            "fronter",
            "fronter",
            (option) => selected.featureX - option.featureX
          ),
          projectionGuide(
            options,
            selected,
            "backer",
            "backer / rounder",
            (option) => option.featureX - selected.featureX
          )
        ]
      : [
          projectionGuide(
            options,
            selected,
            "harder",
            "harder",
            (option) => selected.featureY - option.featureY
          ),
          projectionGuide(
            options,
            selected,
            "softer",
            "softer",
            (option) => option.featureY - selected.featureY
          ),
          projectionGuide(
            options,
            selected,
            "fronter",
            "fronter",
            (option) => selected.featureX - option.featureX
          ),
          projectionGuide(
            options,
            selected,
            "backer",
            "backer",
            (option) => option.featureX - selected.featureX
          )
        ];

  return conceptGuides.filter((guide): guide is ProjectionGuide => guide !== null);
}

function projectionGuideStyle(guide: ProjectionGuide): CSSProperties {
  return {
    "--guide-angle": `${guide.displayAngleDeg}deg`,
    left: `${guide.edgeX}%`,
    top: `${guide.edgeY}%`
  } as CSSProperties;
}

function vectorForDirection(direction: Direction): { x: number; y: number } {
  const vectors: Record<Direction, { x: number; y: number }> = {
    up: { x: 0, y: -1 },
    down: { x: 0, y: 1 },
    left: { x: -1, y: 0 },
    right: { x: 1, y: 0 },
    up_left: { x: -Math.SQRT1_2, y: -Math.SQRT1_2 },
    up_right: { x: Math.SQRT1_2, y: -Math.SQRT1_2 },
    down_left: { x: -Math.SQRT1_2, y: Math.SQRT1_2 },
    down_right: { x: Math.SQRT1_2, y: Math.SQRT1_2 }
  };
  return vectors[direction];
}

function nearestProjectionMove(
  direction: Direction,
  options: PositionedProjectionOption[],
  excludedSymbols: Set<string> = new Set()
): { move: CandidateMove; target: PositionedProjectionOption } | null {
  const vector = vectorForDirection(direction);
  const selected = options.find((option) => option.isSelected);
  if (!selected) {
    return null;
  }

  const targets = options
    .filter(
      (option) =>
        option.symbol !== selected.symbol && !excludedSymbols.has(option.symbol)
    )
    .map((option) => {
      const dx = option.x - selected.x;
      const dy = option.y - selected.y;
      const distance = Math.hypot(dx, dy);
      const projectedDistance = dx * vector.x + dy * vector.y;
      const lateralDistance = Math.abs(dx * -vector.y + dy * vector.x);
      const alignment = distance > 0 ? projectedDistance / distance : 0;
      return {
        option,
        alignment,
        projectedDistance,
        score: projectedDistance + lateralDistance * 0.85
      };
    })
    .filter((target) => target.projectedDistance > 4 && target.alignment > 0.45)
    .sort((left, right) => left.score - right.score);

  const target = targets[0]?.option;
  if (!target) {
    return null;
  }

  return {
    target,
    move: {
      direction,
      replacement: target.symbol,
      label: target.label,
      action: "replace"
    }
  };
}

function keyboardConnections(
  options: PositionedProjectionOption[]
): KeyboardConnection[] {
  const selected = options.find((option) => option.isSelected);
  if (!selected) {
    return [];
  }

  const usedTargetSymbols = new Set<string>();
  return (["up", "down", "left", "right"] as Direction[]).flatMap((direction) => {
    const targetMove = nearestProjectionMove(direction, options, usedTargetSymbols);
    const label = keyboardDirectionLabels[direction];
    if (!targetMove || !label) {
      return [];
    }

    const { move, target } = targetMove;
    usedTargetSymbols.add(target.symbol);
    const dx = target.x - selected.x;
    const dy = target.y - selected.y;
    const length = Math.hypot(dx, dy);
    if (length < 4) {
      return [];
    }

    return [
      {
        id: direction,
        label,
        move,
        x1: selected.x,
        y1: selected.y,
        x2: target.x,
        y2: target.y,
        midpointX: selected.x + dx / 2,
        midpointY: selected.y + dy / 2
      }
    ];
  });
}

function projectionNeighbourConnections(
  options: PositionedProjectionOption[],
  pairs: [string, string][],
  tokenKind: ProjectionOption["tokenKind"]
): ProjectionNeighbourConnection[] {
  const optionsBySymbol = new Map(
    options
      .filter((option) => option.tokenKind === tokenKind)
      .map((option) => [option.symbol, option])
  );

  return pairs.flatMap(([fromSymbol, toSymbol]) => {
    const from = optionsBySymbol.get(fromSymbol);
    const to = optionsBySymbol.get(toSymbol);
    if (!from || !to) {
      return [];
    }
    return [
      {
        id: `${fromSymbol}-${toSymbol}`,
        x1: from.x,
        y1: from.y,
        x2: to.x,
        y2: to.y
      }
    ];
  });
}

function nearestProjectionNeighbourConnections(
  options: PositionedProjectionOption[],
  tokenKind: ProjectionOption["tokenKind"],
  neighbourCount = 2
): ProjectionNeighbourConnection[] {
  const typedOptions = options.filter((option) => option.tokenKind === tokenKind);
  const connectionById = new Map<string, ProjectionNeighbourConnection>();

  typedOptions.forEach((from) => {
    const nearestOptions = typedOptions
      .filter((to) => to.symbol !== from.symbol)
      .map((to) => ({
        to,
        distance: Math.hypot(to.x - from.x, to.y - from.y)
      }))
      .sort((left, right) => left.distance - right.distance)
      .slice(0, neighbourCount);

    nearestOptions.forEach(({ to }) => {
      const symbols = [from.symbol, to.symbol].sort();
      const id = `${symbols[0]}-${symbols[1]}`;
      if (connectionById.has(id)) {
        return;
      }
      connectionById.set(id, {
        id,
        x1: from.x,
        y1: from.y,
        x2: to.x,
        y2: to.y
      });
    });
  });

  return [...connectionById.values()];
}

function projectionNeighbourConnectionsForLanguage(
  options: PositionedProjectionOption[],
  language: string,
  tokenKind: ProjectionOption["tokenKind"],
  shouldRestrict: boolean,
  defaultPairs: [string, string][]
): ProjectionNeighbourConnection[] {
  if (!shouldRestrict) {
    return projectionNeighbourConnections(options, defaultPairs, tokenKind);
  }

  const craftedPairs = languageNeighbourPairs[language]?.[tokenKind];
  if (craftedPairs) {
    return projectionNeighbourConnections(options, craftedPairs, tokenKind);
  }

  return nearestProjectionNeighbourConnections(options, tokenKind);
}

function keyboardConnectionStyle(connection: KeyboardConnection): CSSProperties {
  return {
    left: `${connection.midpointX}%`,
    top: `${connection.midpointY}%`
  };
}

function candidateFromProjection(option: ProjectionOption): CandidateMove {
  return {
    direction: "right",
    replacement: option.symbol,
    label: option.label,
    action: "replace"
  };
}

function infoForToken(token: PhonemeToken | null): PhonemeInfo | null {
  if (!token) {
    return null;
  }
  const knownInfo = phonemeInfo[token.text];
  if (knownInfo) {
    return knownInfo;
  }
  if (token.token_kind === "stress") {
    return {
      name: "stress mark",
      description: "Marks emphasis on the following syllable.",
      examples: ["like the mark before a stressed syllable"]
    };
  }
  if (token.token_kind === "diacritic") {
    return {
      name: "phonetic diacritic",
      description: "A modifier that changes the quality of a neighbouring sound.",
      examples: ["used to fine-tune a phoneme"]
    };
  }
  if (token.token_kind === "vowel" || token.token_kind === "consonant") {
    const baseText = basePhonemeText(token.text);
    const projectionPool =
      token.token_kind === "vowel" ? vowelProjection : consonantProjection;
    const matchedProjection = projectionPool.find(
      (option) => option.symbol === baseText
    );

    if (matchedProjection) {
      const lengthDescription = hasLongMark(token) ? " with a long mark" : "";
      return {
        name: matchedProjection.label,
        description: `${token.text} is a ${token.token_kind} sound${lengthDescription}.`,
        examples: [`symbol: ${token.text}`]
      };
    }

    return {
      name: token.token_kind,
      description: `${token.text} is a ${token.token_kind} sound that is not yet fully supported`,
      examples: [`symbol: ${token.text}`]
    };
  }
  return null;
}

function infoForProjectionOption(option: ProjectionOption): PhonemeInfo {
  return (
    phonemeInfo[option.symbol] ?? {
      name: option.label,
      description: `${option.symbol} is a ${option.tokenKind} sound.`,
      examples: [`symbol: ${option.symbol}`]
    }
  );
}

function tooltipForPhoneme(info: PhonemeInfo): string {
  return [info.name, info.description, ...info.examples].join(". ");
}

function formatVoiceLabel(voiceId: string): string {
  const voiceParts = voiceId.split("_");
  const voiceName = voiceParts[voiceParts.length - 1] ?? voiceId;
  return voiceName.charAt(0).toUpperCase() + voiceName.slice(1);
}

function preferredVoiceForLanguage(
  availableVoices: string[],
  language: string,
  currentVoice: string
): string {
  if (currentVoice.startsWith(language)) {
    return currentVoice;
  }
  return (
    availableVoices.find((availableVoice) => availableVoice.startsWith(language)) ??
    currentVoice
  );
}

function randomStarterWord(currentWord = ""): string {
  const availableWords =
    starterWords.length > 1
      ? starterWords.filter((word) => word !== currentWord.trim())
      : starterWords;
  const index = Math.floor(Math.random() * availableWords.length);
  return availableWords[index] ?? "rough";
}

function selectionAfterMove(
  move: CandidateMove,
  selectedIndex: number,
  nextTokens: PhonemeToken[]
): number | null {
  if (nextTokens.length === 0) {
    return null;
  }
  if (move.action === "replace" || move.action === "insert_copy_before") {
    return Math.min(selectedIndex, nextTokens.length - 1);
  }
  if (move.action === "insert_stress_before") {
    return Math.min(selectedIndex + 1, nextTokens.length - 1);
  }

  const samePosition = nextTokens[selectedIndex];
  if (samePosition?.is_editable) {
    return samePosition.index;
  }
  const previousEditable = nextEditableIndex(nextTokens, selectedIndex, -1);
  return previousEditable ?? firstEditableIndex(nextTokens);
}

function AnimatedConnectionLine({
  className,
  x1,
  y1,
  x2,
  y2,
  endpointPadding = 0
}: AnimatedConnectionLineProps) {
  const lineRef = useRef<SVGLineElement | null>(null);
  const dx = x2 - x1;
  const dy = y2 - y1;
  const length = Math.hypot(dx, dy);
  const padding = Math.min(endpointPadding, length / 2);
  const paddingX = length > 0 ? (dx / length) * padding : 0;
  const paddingY = length > 0 ? (dy / length) * padding : 0;
  const paddedX1 = x1 + paddingX;
  const paddedY1 = y1 + paddingY;
  const paddedX2 = x2 - paddingX;
  const paddedY2 = y2 - paddingY;
  const previousCoordinates = useRef({
    x1: paddedX1,
    y1: paddedY1,
    x2: paddedX2,
    y2: paddedY2
  });

  useLayoutEffect(() => {
    const line = lineRef.current;
    const from = previousCoordinates.current;
    const to = {
      x1: paddedX1,
      y1: paddedY1,
      x2: paddedX2,
      y2: paddedY2
    };
    previousCoordinates.current = to;

    if (!line) {
      return;
    }

    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    const changed =
      from.x1 !== to.x1 ||
      from.y1 !== to.y1 ||
      from.x2 !== to.x2 ||
      from.y2 !== to.y2;

    if (prefersReducedMotion || !changed) {
      line.setAttribute("x1", String(to.x1));
      line.setAttribute("y1", String(to.y1));
      line.setAttribute("x2", String(to.x2));
      line.setAttribute("y2", String(to.y2));
      return;
    }

    let animationFrame = 0;
    let startedAt: number | null = null;
    const interpolate = (start: number, end: number, progress: number) =>
      start + (end - start) * progress;
    const setCoordinates = (progress: number) => {
      line.setAttribute("x1", String(interpolate(from.x1, to.x1, progress)));
      line.setAttribute("y1", String(interpolate(from.y1, to.y1, progress)));
      line.setAttribute("x2", String(interpolate(from.x2, to.x2, progress)));
      line.setAttribute("y2", String(interpolate(from.y2, to.y2, progress)));
    };

    setCoordinates(0);
    const step = (timestamp: number) => {
      startedAt ??= timestamp;
      const progress = Math.min(
        (timestamp - startedAt) / mapAnimationDurationMs,
        1
      );
      setCoordinates(cubicBezierProgress(progress, 0.22, 1, 0.36, 1));
      if (progress < 1) {
        animationFrame = window.requestAnimationFrame(step);
      }
    };
    animationFrame = window.requestAnimationFrame(step);

    return () => window.cancelAnimationFrame(animationFrame);
  }, [paddedX1, paddedY1, paddedX2, paddedY2]);

  return (
    <line
      ref={lineRef}
      className={className}
      x1={paddedX1}
      y1={paddedY1}
      x2={paddedX2}
      y2={paddedY2}
    />
  );
}

export default function App() {
  const [text, setText] = useState(randomStarterWord);
  const [voice, setVoice] = useState("af_bella");
  const [voices, setVoices] = useState<string[]>([]);
  const [language, setLanguage] = useState("a");
  const [result, setResult] = useState<PhonemizeResponse | null>(null);
  const [history, setHistory] = useState<PhonemizeResponse[]>([]);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [lastSpeechRequest, setLastSpeechRequest] = useState<SpeechRequest | null>(null);
  const [showSpectrogram, setShowSpectrogram] = useState(false);
  const [showFixedProjection, setShowFixedProjection] = useState(true);
  const [showNeighbours, setShowNeighbours] = useState(true);
  const [restrictToLanguagePhonemes, setRestrictToLanguagePhonemes] =
    useState(false);
  const [spectrogram, setSpectrogram] = useState<SpectrogramResponse | null>(null);
  const [spectrogramError, setSpectrogramError] = useState<string | null>(null);
  const [spectrogramSettings, setSpectrogramSettings] =
    useState<SpectrogramSettings>(defaultSpectrogramSettings);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingVoices, setIsLoadingVoices] = useState(true);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isLoadingSpectrogram, setIsLoadingSpectrogram] = useState(false);
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [trashDropZoneStyles, setTrashDropZoneStyles] =
    useState<TrashDropZoneStyles | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const workspaceRef = useRef<HTMLElement | null>(null);
  const tokenStripRef = useRef<HTMLDivElement | null>(null);
  const lastConvertedKey = useRef<string | null>(null);
  const phonemeEditBaseline = useRef<PhonemizeResponse | null>(null);
  const mapNodeRefs = useRef<Map<string, HTMLButtonElement>>(new Map());
  const previousMapRects = useRef<Map<string, DOMRect>>(new Map());
  const hasRunInitialConversion = useRef(false);
  const [spectrogramHeight, setSpectrogramHeight] = useState(210);

  useEffect(() => {
    return () => {
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, [audioUrl]);

  useEffect(() => {
    const controller = new AbortController();

    async function loadVoices() {
      setIsLoadingVoices(true);
      try {
        const response = await fetch("/api/voices", { signal: controller.signal });
        if (!response.ok) {
          throw new Error(await response.text());
        }

        const payload = (await response.json()) as VoicesResponse;
        setVoices(payload.voices);
        setVoice((currentVoice) =>
          preferredVoiceForLanguage(
            payload.voices,
            language,
            payload.voices.includes(currentVoice)
              ? currentVoice
              : payload.voices[0] ?? currentVoice
          )
        );
      } catch (caughtError) {
        if (!controller.signal.aborted) {
          setError(
            caughtError instanceof Error
              ? caughtError.message
              : "Unknown voice list failure"
          );
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsLoadingVoices(false);
        }
      }
    }

    void loadVoices();

    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (!showSpectrogram || !lastSpeechRequest) {
      return;
    }

    const controller = new AbortController();

    async function loadSpectrogram() {
      setIsLoadingSpectrogram(true);
      setSpectrogramError(null);
      try {
        const response = await fetch("/api/spectrogram", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            ...lastSpeechRequest,
            window_ms: spectrogramSettings.windowMs,
            hop_ms: spectrogramSettings.hopMs,
            top_db: spectrogramSettings.topDb,
            max_frequency_hz: spectrogramSettings.maxFrequencyHz,
            smoothing: spectrogramSettings.smoothing,
            trim_seconds: spectrogramSettings.trimSeconds
          }),
          signal: controller.signal
        });
        if (!response.ok) {
          throw new Error(await response.text());
        }

        const payload = (await response.json()) as SpectrogramResponse;
        setSpectrogram(payload);
      } catch (caughtError) {
        if (!controller.signal.aborted) {
          setSpectrogramError(
            caughtError instanceof Error
              ? caughtError.message
              : "Unknown spectrogram failure"
          );
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsLoadingSpectrogram(false);
        }
      }
    }

    void loadSpectrogram();

    return () => controller.abort();
  }, [showSpectrogram, lastSpeechRequest, spectrogramSettings]);

  useEffect(() => {
    if (hasRunInitialConversion.current || isLoadingVoices || voices.length === 0) {
      return;
    }

    hasRunInitialConversion.current = true;
    void convertAndSpeak(true, false);
  }, [isLoadingVoices, voices.length, voice]);

  function setMapNodeRef(key: string, node: HTMLButtonElement | null) {
    if (node) {
      mapNodeRefs.current.set(key, node);
    } else {
      mapNodeRefs.current.delete(key);
    }
  }

  const selectedToken = useMemo(() => {
    if (!result || result.selected_index === null) {
      return null;
    }
    return result.tokens.find((token) => token.index === result.selected_index) ?? null;
  }, [result]);

  const selectedPhonemeInfo = useMemo(() => {
    return infoForToken(selectedToken);
  }, [selectedToken]);

  const displayTokens = useMemo(() => {
    return result?.tokens.filter((token) => token.token_kind !== "stress") ?? [];
  }, [result]);

  const projectionOptions = useMemo(() => {
    let options: ProjectionOption[] = [];
    let tokenKind: ProjectionOption["tokenKind"] | null = null;
    if (selectedToken?.token_kind === "vowel") {
      options = vowelProjection;
      tokenKind = "vowel";
    } else if (selectedToken?.token_kind === "consonant") {
      options = consonantProjection;
      tokenKind = "consonant";
    }
    if (!selectedToken || !tokenKind || options.length === 0) {
      return [];
    }

    const selectedProjectionSymbol = basePhonemeText(selectedToken.text);
    const optionsWithSelected = options.some(
      (option) => option.symbol === selectedProjectionSymbol
    )
      ? options
      : [
          {
            symbol: selectedProjectionSymbol,
            label: "current phoneme",
            tokenKind,
            featureX: 50,
            featureY: 50
          },
          ...options
        ];
    const visibleOptions = projectionOptionsForLanguage(
      optionsWithSelected,
      language,
      selectedProjectionSymbol,
      restrictToLanguagePhonemes
    );
    if (showFixedProjection) {
      return positionFixedProjectionOptions(
        visibleOptions,
        selectedProjectionSymbol
      );
    }

    return positionProjectionOptions(visibleOptions, selectedProjectionSymbol);
  }, [language, restrictToLanguagePhonemes, selectedToken, showFixedProjection]);

  const projectionGuides = useMemo(() => {
    return localProjectionGuides(projectionOptions);
  }, [projectionOptions]);

  const keyboardMoveConnections = useMemo(() => {
    return keyboardConnections(projectionOptions);
  }, [projectionOptions]);

  const vowelMapConnections = useMemo(() => {
    if (!showNeighbours || selectedToken?.token_kind !== "vowel") {
      return [];
    }
    return projectionNeighbourConnectionsForLanguage(
      projectionOptions,
      language,
      "vowel",
      restrictToLanguagePhonemes,
      vowelNeighbourPairs
    );
  }, [
    language,
    projectionOptions,
    restrictToLanguagePhonemes,
    selectedToken?.token_kind,
    showNeighbours
  ]);

  const consonantMapConnections = useMemo(() => {
    if (!showNeighbours || selectedToken?.token_kind !== "consonant") {
      return [];
    }
    return projectionNeighbourConnectionsForLanguage(
      projectionOptions,
      language,
      "consonant",
      restrictToLanguagePhonemes,
      consonantNeighbourPairs
    );
  }, [
    language,
    projectionOptions,
    restrictToLanguagePhonemes,
    selectedToken?.token_kind,
    showNeighbours
  ]);

  useLayoutEffect(() => {
    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    const nextRects = new Map<string, DOMRect>();

    mapNodeRefs.current.forEach((node, key) => {
      const runningAnimations = node.getAnimations();
      const currentVisualRect = node.getBoundingClientRect();

      runningAnimations.forEach((animation) => animation.cancel());

      const nextRect = node.getBoundingClientRect();
      const previousRect =
        runningAnimations.length > 0
          ? currentVisualRect
          : previousMapRects.current.get(key);
      nextRects.set(key, nextRect);

      if (prefersReducedMotion || !previousRect) {
        return;
      }

      const deltaX = previousRect.left - nextRect.left;
      const deltaY = previousRect.top - nextRect.top;
      const distance = Math.hypot(deltaX, deltaY);
      if (
        distance < 1 ||
        distance > maxProjectionAnimationDistancePx ||
        !Number.isFinite(distance)
      ) {
        return;
      }

      node.animate(
        [
          {
            transform: `translate(calc(-50% + ${deltaX}px), calc(-50% + ${deltaY}px))`
          },
          { transform: "translate(-50%, -50%)" }
        ],
        {
          duration: mapAnimationDurationMs,
          easing: mapAnimationEasing,
          fill: "both"
        }
      );
    });

    previousMapRects.current = nextRects;
  }, [projectionOptions]);

  useLayoutEffect(() => {
    if (!dragState) {
      setTrashDropZoneStyles(null);
      return;
    }

    const updateTrashDropZoneStyles = () => {
      const workspaceNode = workspaceRef.current;
      const tokenStripNode = tokenStripRef.current;
      if (!workspaceNode || !tokenStripNode) {
        return;
      }

      const workspaceRect = workspaceNode.getBoundingClientRect();
      const tokenStripRect = tokenStripNode.getBoundingClientRect();
      const tokenRects = Array.from(
        tokenStripNode.querySelectorAll<HTMLElement>(".token, .add-token-button")
      ).map((node) => node.getBoundingClientRect());
      const tokenRect = tokenRects[0];
      const phonemeBoxWidth = tokenRect?.width ?? phonemeBoxFallbackSizePx;
      const phonemeBoxHeight = tokenRect?.height ?? phonemeBoxFallbackSizePx;
      const contentLeft =
        tokenRects.length > 0
          ? Math.min(...tokenRects.map((rect) => rect.left))
          : tokenStripRect.left;
      const contentRight =
        tokenRects.length > 0
          ? Math.max(...tokenRects.map((rect) => rect.right))
          : tokenStripRect.right;
      const zoneHeight = phonemeBoxHeight * 2;
      const zoneGap = phonemeBoxWidth * 1.5;
      const minLeft = workspacePaddingPx;
      const maxRight = workspaceRect.width - workspacePaddingPx;
      const leftZoneRight = Math.max(
        minLeft + phonemeBoxWidth,
        contentLeft - workspaceRect.left - zoneGap
      );
      const rightZoneLeft = Math.min(
        maxRight - phonemeBoxWidth,
        contentRight - workspaceRect.left + zoneGap
      );
      const top = Math.max(
        workspacePaddingPx,
        tokenStripRect.top - workspaceRect.top
      );

      setTrashDropZoneStyles({
        left: {
          top,
          left: minLeft,
          width: leftZoneRight - minLeft,
          height: zoneHeight
        },
        right: {
          top,
          left: rightZoneLeft,
          width: maxRight - rightZoneLeft,
          height: zoneHeight
        }
      });
    };

    updateTrashDropZoneStyles();
    window.addEventListener("resize", updateTrashDropZoneStyles);
    return () => window.removeEventListener("resize", updateTrashDropZoneStyles);
  }, [dragState, displayTokens.length]);

  async function convertAndSpeak(
    forceRefresh = false,
    shouldSpeak = true,
    textOverride = text
  ) {
    const trimmedText = textOverride.trim();
    const conversionKey = `${trimmedText}\n${language}\n${voice}`;
    if (
      trimmedText.length === 0 ||
      (!forceRefresh && conversionKey === lastConvertedKey.current) ||
      isLoading ||
      isSpeaking
    ) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/phonemize", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ text: trimmedText, language })
      });
      if (!response.ok) {
        throw new Error(await response.text());
      }

      const payload = (await response.json()) as PhonemizeResponse;
      setResult(payload);
      setHistory([]);
      if (shouldSpeak) {
        await speakPhonemes(payload.phonemes);
      } else {
        setLastSpeechRequest({ phonemes: payload.phonemes, voice, speed: 1.0 });
      }
      lastConvertedKey.current = conversionKey;
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unknown request failure"
      );
    } finally {
      setIsLoading(false);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void convertAndSpeak(true);
  }

  function handleRandomWord() {
    const nextWord = randomStarterWord(text);
    setText(nextWord);
    void convertAndSpeak(true, true, nextWord);
  }

  function handleLanguageChange(nextLanguage: string) {
    setLanguage(nextLanguage);
    setVoice((currentVoice) =>
      preferredVoiceForLanguage(voices, nextLanguage, currentVoice)
    );
  }

  async function speakPhonemes(phonemes: string) {
    const speechRequest = { phonemes, voice, speed: 1.0 };
    setIsSpeaking(true);
    setError(null);
    setSpectrogramError(null);
    try {
      const response = await fetch("/api/speak", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(speechRequest)
      });
      if (!response.ok) {
        throw new Error(await response.text());
      }

      const blob = await response.blob();
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
      const nextAudioUrl = URL.createObjectURL(blob);
      setAudioUrl(nextAudioUrl);
      setLastSpeechRequest(speechRequest);
      if (audioRef.current) {
        audioRef.current.src = nextAudioUrl;
        audioRef.current.load();
        await audioRef.current.play();
      }
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unknown speech failure"
      );
    } finally {
      setIsSpeaking(false);
    }
  }

  function handleSpectrogramDividerPointerDown(
    event: PointerEvent<HTMLButtonElement>
  ) {
    event.preventDefault();
    const startY = event.clientY;
    const startHeight = spectrogramHeight;
    const workspaceHeight = workspaceRef.current?.clientHeight ?? 0;
    const maxHeight = Math.max(180, workspaceHeight - 260);

    function handlePointerMove(moveEvent: globalThis.PointerEvent) {
      const nextHeight = startHeight - (moveEvent.clientY - startY);
      setSpectrogramHeight(Math.min(Math.max(nextHeight, 130), maxHeight));
    }

    function handlePointerUp() {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    }

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp, { once: true });
  }

  function updateSpectrogramSetting(
    key: keyof SpectrogramSettings,
    value: number
  ) {
    setSpectrogramSettings((currentSettings) => ({
      ...currentSettings,
      [key]: value
    }));
  }

  function selectToken(index: number) {
    if (!result) {
      return;
    }
    setResult({ ...result, selected_index: index });
  }

  async function rebuildNavigation(phonemes: string) {
    const response = await fetch("/api/navigation", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ phonemes })
    });
    if (!response.ok) {
      throw new Error(await response.text());
    }
    return (await response.json()) as PhonemizeResponse;
  }

  async function applyCandidate(move: CandidateMove) {
    if (!result || result.selected_index === null) {
      return;
    }
    setError(null);
    setHistory((currentHistory) => [...currentHistory, result]);
    try {
      const selectedIndex = result.selected_index;
      const phonemes = applyMove(result.tokens, result.selected_index, move);
      const nextState = await rebuildNavigation(phonemes);
      setResult({
        ...result,
        ...nextState,
        selected_index: selectionAfterMove(move, selectedIndex, nextState.tokens)
      });
      await speakPhonemes(nextState.phonemes);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unknown edit failure"
      );
    }
  }

  async function toggleStressBeforeToken(tokenIndex: number) {
    if (!result) {
      return;
    }
    setError(null);
    setHistory((currentHistory) => [...currentHistory, result]);
    try {
      const stressEdit = toggleLeadingStress(result.tokens, tokenIndex);
      const nextState = await rebuildNavigation(stressEdit.phonemes);
      setResult({
        ...result,
        ...nextState,
        selected_index: Math.min(stressEdit.selectedIndex, nextState.tokens.length - 1)
      });
      await speakPhonemes(nextState.phonemes);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unknown stress edit failure"
      );
    }
  }

  async function toggleLengthOnToken(tokenIndex: number) {
    if (!result) {
      return;
    }
    await applyTokenEdit(toggleLengthMark(result.tokens, tokenIndex));
  }

  async function applyTokenEdit(edit: { phonemes: string; selectedIndex: number | null }) {
    if (!result) {
      return;
    }
    if (edit.phonemes.length === 0) {
      return;
    }
    setError(null);
    setHistory((currentHistory) => [...currentHistory, result]);
    try {
      const nextState = await rebuildNavigation(edit.phonemes);
      setResult({
        ...result,
        ...nextState,
        selected_index:
          edit.selectedIndex === null
            ? firstEditableIndex(nextState.tokens)
            : Math.min(edit.selectedIndex, nextState.tokens.length - 1)
      });
      await speakPhonemes(nextState.phonemes);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unknown token edit failure"
      );
    }
  }

  function handlePhonemeInputChange(phonemes: string) {
    if (!result) {
      return;
    }
    phonemeEditBaseline.current ??= result;
    setResult({ ...result, phonemes });
  }

  async function commitPhonemeInput() {
    if (!result || !phonemeEditBaseline.current) {
      return;
    }

    const baseline = phonemeEditBaseline.current;
    phonemeEditBaseline.current = null;
    if (result.phonemes === baseline.phonemes) {
      return;
    }

    setError(null);
    setHistory((currentHistory) => [...currentHistory, baseline]);
    try {
      const nextState = await rebuildNavigation(result.phonemes);
      setResult({
        ...result,
        ...nextState,
        selected_index: firstEditableIndex(nextState.tokens)
      });
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unknown IPA edit failure"
      );
    }
  }

  function handleDragStart(tokenIndex: number) {
    setDragState({ tokenIndex, insertBeforeIndex: tokenIndex, isOverTrash: false });
  }

  function handleDragOver(insertBeforeIndex: number | null) {
    setDragState((current) =>
      current ? { ...current, insertBeforeIndex, isOverTrash: false } : current
    );
  }

  function handleTrashDragOver() {
    setDragState((current) =>
      current ? { ...current, insertBeforeIndex: null, isOverTrash: true } : current
    );
  }

  function handleDragEnd() {
    setDragState(null);
  }

  async function handleDrop(insertBeforeIndex: number | null) {
    if (!result || !dragState) {
      setDragState(null);
      return;
    }

    const edit = moveTokenGroup(result.tokens, dragState.tokenIndex, insertBeforeIndex);
    setDragState(null);
    await applyTokenEdit(edit);
  }

  async function handleTrashDrop() {
    if (!result || !dragState) {
      setDragState(null);
      return;
    }

    const edit = deleteTokenGroup(result.tokens, dragState.tokenIndex);
    setDragState(null);
    await applyTokenEdit(edit);
  }

  async function addToken(tokenKind: "vowel" | "consonant") {
    if (!result) {
      return;
    }
    await applyTokenEdit(
      insertToken(result.tokens, tokenKind === "vowel" ? "ə" : "t", tokenKind)
    );
  }

  function undo() {
    setHistory((currentHistory) => {
      const previous =
        currentHistory.length > 0
          ? currentHistory[currentHistory.length - 1]
          : undefined;
      if (previous) {
        setResult(previous);
      }
      return currentHistory.slice(0, -1);
    });
  }

  function handleKeyboard(event: KeyboardEvent<HTMLElement>) {
    const target = event.target;
    if (
      target instanceof HTMLInputElement ||
      target instanceof HTMLTextAreaElement ||
      target instanceof HTMLSelectElement
    ) {
      return;
    }

    if (!result) {
      return;
    }

    const sequenceDirectionMap: Record<string, 1 | -1> = {
      q: -1,
      Q: -1,
      e: 1,
      E: 1
    };
    const sequenceStep = sequenceDirectionMap[event.key];
    if (sequenceStep) {
      event.preventDefault();
      setResult({
        ...result,
        selected_index: nextEditableIndex(
          result.tokens,
          result.selected_index,
          sequenceStep
        )
      });
      return;
    }

    if (event.key === "z") {
      event.preventDefault();
      undo();
      return;
    }

    if (event.key === " ") {
      event.preventDefault();
      void speakPhonemes(result.phonemes);
      return;
    }

    if (result.selected_index !== null && event.key.toLowerCase() === "r") {
      const selectedToken = result.tokens[result.selected_index];
      if (selectedToken?.is_editable) {
        event.preventDefault();
        void applyTokenEdit(removeMarkOrDeleteToken(result.tokens, selectedToken.index));
      }
      return;
    }

    if (result.selected_index !== null && event.key.toLowerCase() === "x") {
      const selectedToken = result.tokens[result.selected_index];
      if (selectedToken && stressableKinds.has(selectedToken.token_kind)) {
        event.preventDefault();
        void toggleStressBeforeToken(selectedToken.index);
      }
      return;
    }

    if (result.selected_index !== null && event.key.toLowerCase() === "c") {
      const selectedToken = result.tokens[result.selected_index];
      if (selectedToken?.token_kind === "vowel") {
        event.preventDefault();
        void toggleLengthOnToken(selectedToken.index);
      }
      return;
    }

    const directionMap: Record<string, Direction> = {
      ArrowUp: "up",
      ArrowDown: "down",
      ArrowLeft: "left",
      ArrowRight: "right",
      w: "up",
      W: "up",
      s: "down",
      S: "down",
      a: "left",
      A: "left",
      d: "right",
      D: "right"
    };
    const direction = directionMap[event.key];
    if (!direction) {
      return;
    }
    const connection = keyboardMoveConnections.find(
      (candidate) => candidate.id === direction
    );
    if (connection) {
      event.preventDefault();
      void applyCandidate(connection.move);
    }
  }

  return (
    <main className="app-shell" tabIndex={0} onKeyDown={handleKeyboard}>
      <section className="top-panel">
        <form onSubmit={handleSubmit} className="composer" aria-label="Phoneme input">
          <label className="text-input-label" htmlFor="input-text">
            <input
              id="input-text"
              value={text}
              onChange={(event) => setText(event.target.value)}
              onBlur={() => void convertAndSpeak()}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  void convertAndSpeak(true);
                }
              }}
            />
            <small>Text</small>
          </label>
          <div className="control-pane">
            <div className="inline-controls">
              <label>
                Voice
                <select
                  value={voice}
                  onChange={(event) => setVoice(event.target.value)}
                  disabled={isLoadingVoices}
                >
                  {(voices.length > 0 ? voices : [voice]).map((voiceId) => (
                    <option key={voiceId} value={voiceId}>
                      {isLoadingVoices ? "Loading voices..." : formatVoiceLabel(voiceId)}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Language
                <select
                  value={language}
                  onChange={(event) => handleLanguageChange(event.target.value)}
                >
                  {languageOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="action-row">
              <button type="submit" disabled={isLoading || isSpeaking}>
                {isLoading ? "Converting..." : isSpeaking ? "Speaking..." : "Convert"}
              </button>
              <button
                type="button"
                disabled={!result || isSpeaking}
                onClick={() => result && void speakPhonemes(result.phonemes)}
              >
                Replay
              </button>
              <button type="button" disabled={history.length === 0} onClick={undo}>
                Undo
              </button>
              <button
                type="button"
                disabled={isLoading || isSpeaking}
                onClick={handleRandomWord}
              >
                Random
              </button>
            </div>
          </div>
        </form>
        <div className="conversion-arrow" aria-hidden="true">
          <span />
        </div>
        <section className="phoneme-summary" aria-label="Current phoneme summary">
          {result ? (
            <>
              <div className="phoneme-string" aria-label="Current phoneme string">
                <input
                  aria-label="Editable IPA phoneme string"
                  value={result.phonemes}
                  onChange={(event) => handlePhonemeInputChange(event.target.value)}
                  onBlur={() => void commitPhonemeInput()}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      event.currentTarget.blur();
                    }
                  }}
                />
                <small>IPA</small>
              </div>
              {selectedToken && selectedPhonemeInfo ? (
                <aside className="phoneme-info" aria-label="Selected phoneme information">
                  <div className="phoneme-info-symbol">{selectedToken.text}</div>
                  <div className="phoneme-info-body">
                    <p className="phoneme-info-name">{selectedPhonemeInfo.name}</p>
                    <p className="phoneme-info-description">
                      {selectedPhonemeInfo.description}
                    </p>
                    <div className="phoneme-info-examples">
                      {selectedPhonemeInfo.examples.map((example) => (
                        <span key={example}>{example}</span>
                      ))}
                    </div>
                  </div>
                </aside>
              ) : null}
            </>
          ) : null}
        </section>
      </section>

      {error ? <pre className="error-box">{error}</pre> : null}

      <section
        ref={workspaceRef}
        className={[
          "workspace",
          showSpectrogram ? "workspace-spectrogram-on" : "workspace-spectrogram-off"
        ]
          .filter(Boolean)
          .join(" ")}
        aria-label="Phoneme navigation workspace"
      >
        {result ? (
          <>
            <div className="projection-toggles projection-toggles-left">
              <label className="projection-toggle">
                <input
                  type="checkbox"
                  checked={restrictToLanguagePhonemes}
                  onChange={(event) =>
                    setRestrictToLanguagePhonemes(event.target.checked)
                  }
                />
                <span>Language phonemes</span>
              </label>
            </div>
            <div className="projection-toggles projection-toggles-right">
              <label className="projection-toggle">
                <input
                  type="checkbox"
                  checked={showFixedProjection}
                  onChange={(event) => setShowFixedProjection(event.target.checked)}
                />
                <span>Fixed projection</span>
              </label>
              <label className="projection-toggle">
                <input
                  type="checkbox"
                  checked={showNeighbours}
                  onChange={(event) => setShowNeighbours(event.target.checked)}
                />
                <span>Neighbours</span>
              </label>
            </div>
            {dragState ? (
              <>
                {(["left", "right"] as const).map((edge) => (
                  <div
                    key={edge}
                    className={[
                      "trash-drop-zone",
                      `trash-drop-zone-${edge}`,
                      dragState.isOverTrash ? "trash-drop-zone-active" : ""
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    style={trashDropZoneStyles?.[edge]}
                    aria-label="Delete dragged phoneme"
                    role="button"
                    onDragEnter={(event) => {
                      event.preventDefault();
                      handleTrashDragOver();
                    }}
                    onDragOver={(event) => {
                      event.preventDefault();
                      event.dataTransfer.dropEffect = "move";
                      handleTrashDragOver();
                    }}
                    onDrop={(event) => {
                      event.preventDefault();
                      void handleTrashDrop();
                    }}
                  >
                    <span className="trash-can-icon" aria-hidden="true">
                      <span className="trash-can-lid" />
                      <span className="trash-can-bin" />
                    </span>
                  </div>
                ))}
              </>
            ) : null}
            <div
              ref={tokenStripRef}
              className="token-strip"
              aria-label="Editable phoneme tokens"
            >
              <div className="token-row-labels" aria-hidden="true">
                <span>marks</span>
                <span>phoneme</span>
              </div>
              {displayTokens.map((token) => (
                <div
                  key={token.index}
                  className={[
                    "token-drop-slot",
                    dragState?.insertBeforeIndex === token.index
                      ? "token-drop-active"
                      : ""
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  onDragOver={(event) => {
                    event.preventDefault();
                    handleDragOver(token.index);
                  }}
                  onDrop={(event) => {
                    event.preventDefault();
                    void handleDrop(token.index);
                  }}
                >
                  <span className="token-insertion-line" aria-hidden="true" />
                  <div
                    className="token-column"
                    draggable={token.is_editable}
                    onDragStart={() => handleDragStart(token.index)}
                    onDragEnd={handleDragEnd}
                  >
                  <div className="token-mark-controls">
                    {stressableKinds.has(token.token_kind) ? (
                      <button
                        type="button"
                        className={[
                          "mark-toggle",
                          "stress-toggle",
                          leadingStress(result.tokens, token.index)
                            ? "mark-toggle-active"
                            : ""
                        ]
                          .filter(Boolean)
                          .join(" ")}
                        title="Cycle stress: primary, secondary, none"
                        onClick={() => void toggleStressBeforeToken(token.index)}
                      >
                        {stressLabel(leadingStress(result.tokens, token.index))}
                      </button>
                    ) : (
                      <span className="mark-spacer" aria-hidden="true" />
                    )}
                    {token.token_kind === "vowel" ? (
                      <button
                        type="button"
                        className={[
                          "mark-toggle",
                          "length-toggle",
                          hasLongMark(token) ? "mark-toggle-active" : ""
                        ]
                          .filter(Boolean)
                          .join(" ")}
                        title="Toggle long vowel mark"
                        onClick={() => void toggleLengthOnToken(token.index)}
                      >
                        ː
                      </button>
                    ) : (
                      <span className="mark-spacer" aria-hidden="true" />
                    )}
                  </div>
                  <button
                    type="button"
                    className={[
                      "token",
                      token.index === result.selected_index ? "token-selected" : "",
                      editableKinds.has(token.token_kind) ? "" : "token-muted"
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    disabled={!token.is_editable}
                    onClick={() => selectToken(token.index)}
                  >
                    <span>{token.text}</span>
                    <small>{token.token_kind}</small>
                  </button>
                  </div>
                </div>
              ))}
              <div
                className={[
                  "token-drop-slot",
                  dragState?.insertBeforeIndex === null && !dragState?.isOverTrash
                    ? "token-drop-active"
                    : ""
                ]
                  .filter(Boolean)
                  .join(" ")}
                onDragOver={(event) => {
                  event.preventDefault();
                  handleDragOver(null);
                }}
                onDrop={(event) => {
                  event.preventDefault();
                  void handleDrop(null);
                }}
              >
                <span className="token-insertion-line" aria-hidden="true" />
                <div className="add-token-group">
                  <button
                    type="button"
                    className="add-token-button"
                    title="Add consonant"
                    onClick={() => void addToken("consonant")}
                  >
                    +
                    <small>C</small>
                  </button>
                  <button
                    type="button"
                    className="add-token-button"
                    title="Add vowel"
                    onClick={() => void addToken("vowel")}
                  >
                    +
                    <small>V</small>
                  </button>
                </div>
              </div>
            </div>
            <div className="neighbourhood-board">
              {projectionGuides.length > 0 ? (
                <div className="projection-edge-guides" aria-hidden="true">
                  {projectionGuides.map((guide) => (
                    <span
                      key={guide.id}
                      className="projection-edge-guide"
                      style={projectionGuideStyle(guide)}
                    >
                      <span>{guide.label}</span>
                      <span className="projection-edge-guide-arrow">
                        {guide.isFlipped ? "←" : "→"}
                      </span>
                    </span>
                  ))}
                </div>
              ) : null}
              <svg
                className="keyboard-connection-layer"
                viewBox="0 0 100 100"
                preserveAspectRatio="none"
                aria-hidden="true"
              >
                {vowelMapConnections.map((connection) => (
                  <AnimatedConnectionLine
                    key={connection.id}
                    className="vowel-neighbour-line"
                    x1={connection.x1}
                    y1={connection.y1}
                    x2={connection.x2}
                    y2={connection.y2}
                    endpointPadding={2.0}
                  />
                ))}
                {consonantMapConnections.map((connection) => (
                  <AnimatedConnectionLine
                    key={connection.id}
                    className="consonant-neighbour-line"
                    x1={connection.x1}
                    y1={connection.y1}
                    x2={connection.x2}
                    y2={connection.y2}
                    endpointPadding={2.0}
                  />
                ))}
                {keyboardMoveConnections.map((connection) => (
                  <AnimatedConnectionLine
                    key={connection.id}
                    className="keyboard-connection-line"
                    x1={connection.x1}
                    y1={connection.y1}
                    x2={connection.x2}
                    y2={connection.y2}
                    endpointPadding={3.2}
                  />
                ))}
              </svg>
              {keyboardMoveConnections.map((connection) => (
                <span
                  key={connection.id}
                  className="keyboard-connection"
                  style={keyboardConnectionStyle(connection)}
                  aria-hidden="true"
                >
                  <span className="keyboard-connection-label">
                    {connection.label}
                  </span>
                </span>
              ))}
              {projectionOptions.length > 0 && selectedToken ? (
                projectionOptions.map((option) => {
                  const isSelected =
                    option.symbol === basePhonemeText(selectedToken.text);
                  const optionInfo = infoForProjectionOption(option);
                  return (
                    <button
                      key={option.symbol}
                      type="button"
                      className={[
                        "candidate-node",
                        isSelected ? "candidate-current" : ""
                      ]
                        .filter(Boolean)
                        .join(" ")}
                      style={{ left: `${option.x}%`, top: `${option.y}%` }}
                      title={tooltipForPhoneme(optionInfo)}
                      aria-label={`${option.symbol}, ${optionInfo.name}`}
                      disabled={isSelected}
                      ref={(node) => setMapNodeRef(`projection-${option.symbol}`, node)}
                      onClick={() => void applyCandidate(candidateFromProjection(option))}
                    >
                      <strong>{option.symbol}</strong>
                      <span className="phoneme-tooltip" role="tooltip">
                        <span className="phoneme-tooltip-name">
                          {optionInfo.name}
                        </span>
                        <span className="phoneme-tooltip-description">
                          {optionInfo.description}
                        </span>
                        <span className="phoneme-tooltip-examples">
                          {optionInfo.examples.join(" · ")}
                        </span>
                      </span>
                    </button>
                  );
                })
              ) : (
                <span className="projection-empty">
                  Select a vowel or consonant to see the projection.
                </span>
              )}
            </div>
            <audio
              ref={audioRef}
              className="audio-player"
              controls
              hidden={!audioUrl}
            />
            <div className="workspace-bottom-bar">
              <label className="spectrogram-toggle">
                <input
                  type="checkbox"
                  checked={showSpectrogram}
                  onChange={(event) => setShowSpectrogram(event.target.checked)}
                />
                <span>Spectrogram</span>
              </label>
              {showSpectrogram ? (
                <div className="spectrogram-controls" aria-label="Spectrogram controls">
                  <label>
                    Window
                    <input
                      type="range"
                      min="10"
                      max="80"
                      step="1"
                      value={spectrogramSettings.windowMs}
                      onChange={(event) =>
                        updateSpectrogramSetting("windowMs", Number(event.target.value))
                      }
                    />
                    <span>{spectrogramSettings.windowMs} ms</span>
                  </label>
                  <label>
                    Hop
                    <input
                      type="range"
                      min="1"
                      max="40"
                      step="1"
                      value={spectrogramSettings.hopMs}
                      onChange={(event) =>
                        updateSpectrogramSetting("hopMs", Number(event.target.value))
                      }
                    />
                    <span>{spectrogramSettings.hopMs} ms</span>
                  </label>
                  <label>
                    Range
                    <input
                      type="range"
                      min="40"
                      max="120"
                      step="5"
                      value={spectrogramSettings.topDb}
                      onChange={(event) =>
                        updateSpectrogramSetting("topDb", Number(event.target.value))
                      }
                    />
                    <span>{spectrogramSettings.topDb} dB</span>
                  </label>
                  <label>
                    Max Hz
                    <input
                      type="range"
                      min="1000"
                      max="12000"
                      step="500"
                      value={spectrogramSettings.maxFrequencyHz}
                      onChange={(event) =>
                        updateSpectrogramSetting(
                          "maxFrequencyHz",
                          Number(event.target.value)
                        )
                      }
                    />
                    <span>{spectrogramSettings.maxFrequencyHz}</span>
                  </label>
                  <label>
                    Smooth
                    <input
                      type="range"
                      min="0"
                      max="2.5"
                      step="0.25"
                      value={spectrogramSettings.smoothing}
                      onChange={(event) =>
                        updateSpectrogramSetting("smoothing", Number(event.target.value))
                      }
                    />
                    <span>{spectrogramSettings.smoothing.toFixed(2)}</span>
                  </label>
                </div>
              ) : null}
            </div>
            {showSpectrogram ? (
              <>
                <button
                  type="button"
                  className="spectrogram-divider"
                  aria-label="Resize spectrogram"
                  onPointerDown={handleSpectrogramDividerPointerDown}
                >
                  <span />
                </button>
                <section
                  className="spectrogram-panel"
                  aria-label="Speech spectrogram"
                  style={{ height: `${spectrogramHeight}px` }}
                >
                  {spectrogram ? (
                    <div className="spectrogram-plot-frame">
                      <Suspense
                        fallback={
                          <div className="spectrogram-empty">
                            Loading spectrogram plot...
                          </div>
                        }
                      >
                        <Plot
                          className="spectrogram-plot"
                          data={[
                            {
                              type: "heatmap",
                              x: spectrogram.times_s,
                              y: spectrogram.frequencies_hz,
                              z: spectrogram.magnitudes_db,
                              colorscale: "Viridis",
                              zmin: -spectrogram.top_db,
                              zmax: 0,
                              zsmooth: "best",
                              hovertemplate:
                                "Time %{x:.2f} s<br>Frequency %{y:.0f} Hz<br>%{z:.1f} dB<extra></extra>"
                            }
                          ]}
                          layout={{
                            autosize: true,
                            height: spectrogramHeight - 18,
                            margin: { l: 54, r: 18, t: 8, b: 38 },
                            paper_bgcolor: "rgba(0,0,0,0)",
                            plot_bgcolor: "rgba(0,0,0,0)",
                            xaxis: {
                              title: { text: "Time (s)" },
                              fixedrange: false
                            },
                            yaxis: {
                              title: { text: "Frequency (Hz)" },
                              range: [0, spectrogram.max_frequency_hz],
                              fixedrange: false
                            }
                          }}
                          config={{
                            displayModeBar: true,
                            displaylogo: false,
                            responsive: true,
                            scrollZoom: true,
                            modeBarButtonsToRemove: [
                              "select2d",
                              "lasso2d",
                              "toImage"
                            ]
                          }}
                          useResizeHandler
                          style={{ width: "100%", height: "100%" }}
                        />
                      </Suspense>
                      {isLoadingSpectrogram || spectrogramError ? (
                        <div className="spectrogram-status" role="status">
                          {isLoadingSpectrogram ? "Updating spectrogram..." : spectrogramError}
                        </div>
                      ) : null}
                    </div>
                  ) : (
                    <div className="spectrogram-empty">
                      {isLoadingSpectrogram
                        ? "Loading spectrogram..."
                        : spectrogramError ?? "Replay audio to generate a spectrogram."}
                    </div>
                  )}
                </section>
              </>
            ) : null}
          </>
        ) : (
          <div className="empty-workspace">
            {isLoading || isLoadingVoices ? "Loading phoneme map..." : "Enter text to begin"}
          </div>
        )}
      </section>

      <footer className="instructions">
        <span>Click a phoneme to select it.</span>
        <span>Drag to change order.</span>
        <span>Click marks above a phoneme for stress or vowel length.</span>
        <span>Use arrows or WASD to move on the map.</span>
        <span>Use Q/E for previous or next phoneme</span> 
        <span>X for ph. stress</span> 
        <span>C for ph. length</span> 
        <span>R to remove ph.</span> 
        <span>z to undo</span> 
        <span> space to replay</span> 
      </footer>
    </main>
  );
}
