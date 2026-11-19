import { countFingers, type Fingers } from "./hands";
import type { Accidental, Letter, Quality } from "./theory";

const BY_COUNT: Letter[] = ["C", "D", "E", "F", "G"];

/** Sol el → akorun harfi. null = sessizlik (yumruk ya da el yok). */
export function letterFromLeft(f: Fingers): Letter | null {
  const [thumb, index, middle, ring, pinky] = f;
  const count = countFingers(f);

  if (count === 0) return null;
  if (thumb && !index && !middle && !ring && !pinky) return "A"; // 👍
  if (!thumb && index && !middle && !ring && pinky) return "B"; // 🤘
  return BY_COUNT[count - 1]; // 1–5 parmak → C–G
}

/** Sağ el → ♭/♯ ve akor tipi. Sağ el yoksa doğal majör. */
export function colourFromRight(f?: Fingers): { accidental: Accidental; quality: Quality } {
  if (!f) return { accidental: 0, quality: "major" };

  const [thumb, index, middle, ring, pinky] = f;
  // Sadece başparmak: parmak sayısına bakmadan ÖNCE kontrol et (yoksa "1 = ♯" olur)
  if (thumb && !index && !middle && !ring && !pinky) return { accidental: -1, quality: "major" }; // 👍 ♭

  switch (countFingers(f)) {
    case 1: return { accidental: 1, quality: "major" }; // ☝️ ♯
    case 2: return { accidental: 0, quality: "minor" }; // ✌️ m
    case 3: return { accidental: 0, quality: "seventh" }; // 🤟 7
    case 4: return { accidental: -1, quality: "minor" }; // 🖖 ♭m
    case 5: return { accidental: 1, quality: "minor" }; // 🖐️ ♯m
    default: return { accidental: 0, quality: "major" }; // ✊ majör
  }
}