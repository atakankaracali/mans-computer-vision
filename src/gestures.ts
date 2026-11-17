import { countFingers, type Fingers } from "./hands";
import type { Modifier } from "./theory";

/** Left hand → scale degree (1–7). null = silence (fist or no hand). */
export function degreeFromLeft(f: Fingers): number | null {
  const [thumb, index, middle, ring, pinky] = f;
  const count = countFingers(f);

  if (count === 0) return null;
  if (thumb && !index && !middle && !ring && !pinky) return 6; // 👍
  if (!thumb && index && !middle && !ring && pinky) return 7; // 🤘
  return count; // 1–5 finger → I–V
}

/** Right hand is Chor color. If there is no right hand, it's a simple chord. */
export function modifierFromRight(f?: Fingers): Modifier {
  if (!f) return "triad";
  switch (countFingers(f)) {
    case 2: return "swap";
    case 3: return "seventh";
    case 4: return "sus4";
    case 5: return "add9";
    default: return "triad";
  }
}