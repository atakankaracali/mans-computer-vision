import "./style.css";
import { HandLandmarker } from "@mediapipe/tasks-vision";
import {
  assignHands,
  countFingers,
  createHandTracker,
  FingerReader,
  measureFingers,
  type FingerMetrics,
  type Fingers,
  type Landmarks,
} from "./hands";
import { colourFromRight, letterFromLeft } from "./gestures";
import { buildChord } from "./theory";
import { ChordSynth } from "./audio";
import { Transport } from "./transport";

const video = document.getElementById("video") as HTMLVideoElement;
const overlay = document.getElementById("overlay") as HTMLCanvasElement;
const startButton = document.getElementById("start") as HTMLButtonElement;
const status = document.getElementById("status") as HTMLParagraphElement;
const debug = document.getElementById("debug") as HTMLDivElement;
const chordName = document.getElementById("chordName") as HTMLDivElement;
const chordNotes = document.getElementById("chordNotes") as HTMLDivElement;

let tracker: HandLandmarker;
let synth: ChordSynth;
let transport: Transport;
let currentChordId = "off"; // its for which chor is now, if it is same do not play again.
let lastVideoTime = -1;
const leftReader = new FingerReader();
const rightReader = new FingerReader();
const settings = { octave: 3 };

async function start() {
  startButton.disabled = true;
  try {
    synth = new ChordSynth();
    await synth.ctx.resume();
    transport = new Transport(synth.ctx);
    transport.onStep((step, time) => {
      if (step % 4 === 0) click(time, step === 0);
    });
    transport.start();
    status.textContent = "opening camera…";
    video.srcObject = await navigator.mediaDevices.getUserMedia({
      video: {
        width: { ideal: 1280 },
        height: { ideal: 720 },
        facingMode: "user",
      },
      audio: false,
    });
    await video.play();

    overlay.width = video.videoWidth;
    overlay.height = video.videoHeight;

    status.textContent = "loading hand model…";
    tracker = await createHandTracker();

    document.getElementById("start-screen")!.remove();
    requestAnimationFrame(loop);
  } catch (err) {
    console.error(err);
    status.textContent = `Could not start: ${(err as Error).message}`;
    startButton.disabled = false;
  }
}

function loop(now: number) {
  if (video.currentTime !== lastVideoTime) {
    lastVideoTime = video.currentTime;
    const result = tracker.detectForVideo(video, now);

    const aspect = video.videoWidth / video.videoHeight;
    const { left, right } = assignHands(result.landmarks);

    const leftMetrics = left && measureFingers(left, aspect);
    const rightMetrics = right && measureFingers(right, aspect);

    // El kaybolursa okuyucuyu sıfırla, geri geldiğinde temiz başlasın
    const leftFingers = leftMetrics
      ? leftReader.read(leftMetrics)
      : (leftReader.reset(), undefined);
    const rightFingers = rightMetrics
      ? rightReader.read(rightMetrics)
      : (rightReader.reset(), undefined);

    const letter = leftFingers ? letterFromLeft(leftFingers) : null;
    const chord = letter
      ? buildChord(
          { letter, ...colourFromRight(rightFingers) },
          settings.octave,
        )
      : null;
    const chordId = chord ? chord.name : "off";

    if (chordId !== currentChordId) {
      currentChordId = chordId;

      if (chord) {
        synth.play(chord.midi);
        chordName.textContent = chord.name;
        chordNotes.textContent = chord.notes.join(" · ");
        chordName.classList.remove("silent");
      } else {
        synth.releaseAll();
        chordName.classList.add("silent");
      }
    }

    debug.textContent =
      `L ${formatFingers(leftFingers)}  ${formatMetrics(leftMetrics)}\n` +
      `R ${formatFingers(rightFingers)}  ${formatMetrics(rightMetrics)}`;
    drawHands(left, right);
  }
  requestAnimationFrame(loop);
}

function formatFingers(f?: Fingers): string {
  if (!f) return "—";
  return `${f.map((open) => (open ? "▮" : "▯")).join("")}  ${countFingers(f)}`;
}
function formatMetrics(m?: FingerMetrics): string {
  if (!m) return "";
  const [thumb, ...rest] = m.values;
  return `👍 ${thumb.toFixed(2)}/${m.thumbStraight.toFixed(2)}  ${rest.map((v) => v.toFixed(2)).join(" ")}`;
}
function click(time: number, accent: boolean) {
  const osc = new OscillatorNode(synth.ctx, {
    frequency: accent ? 1500 : 1000,
  });
  const amp = new GainNode(synth.ctx, { gain: 0 });
  osc.connect(amp).connect(synth.ctx.destination);
  amp.gain.setValueAtTime(0.3, time);
  amp.gain.exponentialRampToValueAtTime(0.001, time + 0.05);
  osc.start(time);
  osc.stop(time + 0.06);
}

function drawHands(left?: Landmarks, right?: Landmarks) {
  const ctx = overlay.getContext("2d")!;
  const { width: w, height: h } = overlay;
  ctx.clearRect(0, 0, w, h);

  const draw = (hand: Landmarks | undefined, color: string) => {
    if (!hand) return;
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    for (const { start, end } of HandLandmarker.HAND_CONNECTIONS) {
      ctx.beginPath();
      ctx.moveTo(hand[start].x * w, hand[start].y * h);
      ctx.lineTo(hand[end].x * w, hand[end].y * h);
      ctx.stroke();
    }
    ctx.fillStyle = "#fff";
    for (const p of hand) {
      ctx.beginPath();
      ctx.arc(p.x * w, p.y * h, 5, 0, Math.PI * 2);
      ctx.fill();
    }
  };

  draw(left, "rgba(245, 165, 36, 0.7)");
  draw(right, "rgba(79, 209, 197, 0.7)");
}

startButton.addEventListener("click", start);
