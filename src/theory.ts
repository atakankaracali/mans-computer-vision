export const LETTERS = ["C", "D", "E", "F", "G", "A", "B"] as const;
export type Letter = (typeof LETTERS)[number];
export type Accidental = -1 | 0 | 1; // ♭ = -1, doğal = 0, ♯ = +1
export type Quality = "major" | "minor" | "seventh";

export interface ChordSpec {
  letter: Letter;
  accidental: Accidental;
  quality: Quality;
}

export interface Chord {
  name: string; // "A♭m"
  notes: string[]; // ["G#", "B", "D#"]
  midi: number[]; // çalınacak notalar (bas + akor)
}

// Her harfin C'ye uzaklığı (yarım ses)
const LETTER_PC: Record<Letter, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

// Akor = kök + aralıklar (yarım ses)
const INTERVALS: Record<Quality, number[]> = {
  major: [0, 4, 7], // kök, büyük üçlü, tam beşli
  minor: [0, 3, 7], // kök, küçük üçlü, tam beşli
  seventh: [0, 4, 7, 10], // majör + küçük yedili (dominant 7)
};

const SUFFIX: Record<Quality, string> = { major: "", minor: "m", seventh: "7" };
const SIGN: Record<Accidental, string> = { [-1]: "♭", 0: "", 1: "♯" };
const NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

export function buildChord({ letter, accidental, quality }: ChordSpec, octave: number): Chord {
  // +12: C♭ gibi durumlarda negatif sayı çıkmasın (JS'te -1 % 12 = -1)
  const rootPc = (LETTER_PC[letter] + accidental + 12) % 12;
  const rootMidi = 12 * (octave + 1) + rootPc; // octave 3 → C3 = MIDI 48
  const intervals = INTERVALS[quality];

  return {
    name: letter + SIGN[accidental] + SUFFIX[quality],
    notes: intervals.map((i) => NOTE_NAMES[(rootPc + i) % 12]),
    midi: [rootMidi - 12, ...intervals.map((i) => rootMidi + i)],
  };
}