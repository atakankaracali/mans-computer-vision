export const KEYS = ["C", "Db", "D", "Eb", "E", "F", "F#", "G", "Ab", "A", "Bb", "B"] as const;
export type Key = (typeof KEYS)[number];
export type Mode = "major" | "minor";
export type Modifier = "triad" | "swap" | "seventh" | "sus4" | "add9";

export interface Chord {
  name: string;
  roman: string;
  midi: number[];
}

const SHARPS = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const FLATS = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"];
const ROMAN = ["I", "II", "III", "IV", "V", "VI", "VII"];

const SCALES: Record<Mode, number[]> = {
  major: [0, 2, 4, 5, 7, 9, 11],
  minor: [0, 2, 3, 5, 7, 8, 10],
};

type Quality = "maj" | "min" | "dim" | "aug";
const TRIAD_SUFFIX: Record<Quality, string> = { maj: "", min: "m", dim: "°", aug: "+" };

function usesFlats(key: Key, mode: Mode): boolean {
  if (key.includes("b") || key === "F") return true;
  return mode === "minor" && ["C", "D", "G"].includes(key);
}

function scaleTone(scale: number[], step: number): number {
  return scale[step % 7] + 12 * Math.floor(step / 7);
}

function triadQuality(third: number, fifth: number): Quality {
  if (third === 4) return fifth === 8 ? "aug" : "maj";
  return fifth === 6 ? "dim" : "min";
}

function seventhSuffix(quality: Quality, seventh: number): string {
  if (quality === "maj") return seventh === 11 ? "maj7" : "7";
  if (quality === "min") return seventh === 11 ? "m(maj7)" : "m7";
  if (quality === "dim") return seventh === 10 ? "m7♭5" : "°7";
  return "+7";
}

function romanFor(degree: number, quality: Quality | "sus"): string {
  const base = ROMAN[degree - 1];
  if (quality === "min") return base.toLowerCase();
  if (quality === "dim") return base.toLowerCase() + "°";
  if (quality === "aug") return base + "+";
  return base;
}

export function buildChord(key: Key, mode: Mode, degree: number, modifier: Modifier, octave: number): Chord {
  const scale = SCALES[mode];
  const step = degree - 1;
  const rootOffset = scale[step];

  const stack = [0, 2, 4, 6].map((s) => scaleTone(scale, step + s) - rootOffset);
  const diatonic = triadQuality(stack[1], stack[2]);

  let intervals: number[];
  let quality: Quality | "sus" = diatonic;
  let suffix: string;
  let romanSuffix = "";

  switch (modifier) {
    case "triad":
      intervals = stack.slice(0, 3);
      suffix = TRIAD_SUFFIX[diatonic];
      break;
    case "swap":
      quality = diatonic === "maj" || diatonic === "aug" ? "min" : "maj";
      intervals = quality === "maj" ? [0, 4, 7] : [0, 3, 7];
      suffix = TRIAD_SUFFIX[quality];
      break;
    case "seventh":
      intervals = stack;
      suffix = seventhSuffix(diatonic, stack[3]);
      romanSuffix = stack[3] === 11 && diatonic === "maj" ? "maj7" : "7";
      break;
    case "sus4":
      quality = "sus";
      intervals = [0, 5, 7];
      suffix = "sus4";
      romanSuffix = "sus4";
      break;
    case "add9":
      intervals = [...stack.slice(0, 3), 14];
      suffix = TRIAD_SUFFIX[diatonic] + "add9";
      romanSuffix = "add9";
      break;
  }

  let roman = romanFor(degree, quality) + romanSuffix;
  if (modifier === "seventh" && diatonic === "dim" && stack[3] === 10) roman = roman.replace("°7", "ø7");

  const rootPc = (KEYS.indexOf(key) + rootOffset) % 12;
  const names = usesFlats(key, mode) ? FLATS : SHARPS;
  const rootMidi = 12 * (octave + 1) + rootPc;

  return {
    name: names[rootPc] + suffix,
    roman,
    midi: [rootMidi - 12, ...intervals.map((i) => rootMidi + i)],
  };
}