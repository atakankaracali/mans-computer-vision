import { FilesetResolver, HandLandmarker, type NormalizedLandmark } from "@mediapipe/tasks-vision";
const MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task";

export async function createHandTracker(): Promise<HandLandmarker> {
  const fileset = await FilesetResolver.forVisionTasks("/mediapipe");

  return HandLandmarker.createFromOptions(fileset, {
    baseOptions: { modelAssetPath: MODEL_URL, delegate: "GPU" },
    runningMode: "VIDEO",
    numHands: 2,
  });
}

export type Landmarks = NormalizedLandmark[];
export type Fingers = [boolean, boolean, boolean, boolean, boolean];

const FINGER = { open: 1.25, close: 1.1 };
const THUMB = { open: 0.8, close: 0.6 };
const THUMB_STRAIGHT = 0.8;

export interface FingerMetrics {
  values: number[];
  thumbStraight: number;
}

export function measureFingers(lm: Landmarks, aspect: number): FingerMetrics {
  const d = (a: number, b: number) =>
    Math.hypot((lm[a].x - lm[b].x) * aspect, lm[a].y - lm[b].y, (lm[a].z - lm[b].z) * aspect);

  const palm = d(0, 9);
  const ratio = (tip: number, pip: number) => d(tip, 0) / d(pip, 0);

  return {
    values: [d(4, 5) / palm, ratio(8, 6), ratio(12, 10), ratio(16, 14), ratio(20, 18)],
    thumbStraight: d(2, 4) / (d(2, 3) + d(3, 4)),
  };
}

export class FingerReader {
  private state: Fingers = [false, false, false, false, false];

  read(m: FingerMetrics): Fingers {
    this.state = m.values.map((value, i) => {
      const t = i === 0 ? THUMB : FINGER;
      const threshold = this.state[i] ? t.close : t.open;
      const straightEnough = i !== 0 || m.thumbStraight > THUMB_STRAIGHT;
      return value > threshold && straightEnough;
    }) as Fingers;
    return this.state;
  }

  reset() {
    this.state = [false, false, false, false, false];
  }
}

export const countFingers = (f: Fingers) => f.filter(Boolean).length;

export function assignHands(hands: Landmarks[]): { left?: Landmarks; right?: Landmarks } {
  if (hands.length >= 2) {
    const [a, b] = [...hands].sort((h1, h2) => h2[0].x - h1[0].x);
    return { left: a, right: b };
  }
  if (hands.length === 1) {
    return hands[0][0].x > 0.5 ? { left: hands[0] } : { right: hands[0] };
  }
  return {};
}