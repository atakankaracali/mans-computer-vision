export type Patch = "pad" | "keys" | "pluck";

interface PatchDef {
  waves: [OscillatorType, OscillatorType];
  detune: number; // iki osilatör arası fark (cent; 100 cent = 1 yarım ses)
  cutoff: number; // filtre frekansı (Hz)
  attack: number; // saniye
  decay: number;
  sustain: number; // 0–1
  release: number;
}

const PATCHES: Record<Patch, PatchDef> = {
  pad: { waves: ["sawtooth", "sawtooth"], detune: 12, cutoff: 1800, attack: 0.25, decay: 0.6, sustain: 0.8, release: 0.9 },
  keys: { waves: ["triangle", "sine"], detune: 4, cutoff: 3500, attack: 0.008, decay: 0.8, sustain: 0.45, release: 0.4 },
  pluck: { waves: ["sawtooth", "square"], detune: 6, cutoff: 2600, attack: 0.004, decay: 0.5, sustain: 0, release: 0.3 },
};

interface Voice {
  oscs: OscillatorNode[];
  amp: GainNode;
}

// MIDI 69 = A4 = 440 Hz; her yarım ses frekansı 2^(1/12) ile çarpar
const midiToHz = (midi: number) => 440 * 2 ** ((midi - 69) / 12);

export class ChordSynth {
  readonly ctx = new AudioContext({ latencyHint: "interactive" });
  readonly analyser: AnalyserNode; // Adım 8'de dalga formunu çizmek için
  patch: Patch = "pad";
  private readonly master: GainNode;
  private voices: Voice[] = [];

  constructor() {
    const { ctx } = this;
    this.master = new GainNode(ctx, { gain: 0.7 });
    const compressor = new DynamicsCompressorNode(ctx, { threshold: -14, ratio: 4 });
    const reverb = new ConvolverNode(ctx, { buffer: this.createImpulse(2.4) });
    const wet = new GainNode(ctx, { gain: 0.28 }); // reverb miktarı
    this.analyser = new AnalyserNode(ctx, { fftSize: 2048 });

    this.master.connect(compressor); // kuru ses
    this.master.connect(reverb).connect(wet).connect(compressor); // yankılı ses
    compressor.connect(ctx.destination);
    compressor.connect(this.analyser);
  }

  setVolume(value: number) {
    this.master.gain.setTargetAtTime(value, this.ctx.currentTime, 0.05);
  }

  play(notes: number[]) {
    this.releaseAll(); // önceki akoru söndür
    const p = PATCHES[this.patch];
    const now = this.ctx.currentTime;
    const level = 0.32 / Math.sqrt(notes.length); // çok nota = her biri biraz daha sessiz

    for (const note of notes) {
      const amp = new GainNode(this.ctx, { gain: 0 });
      const filter = new BiquadFilterNode(this.ctx, { type: "lowpass", frequency: p.cutoff, Q: 0.7 });
      filter.connect(amp).connect(this.master);

      const oscs = p.waves.map((type, i) => {
        const osc = new OscillatorNode(this.ctx, {
          type,
          frequency: midiToHz(note),
          detune: i === 0 ? -p.detune / 2 : p.detune / 2,
        });
        osc.connect(filter);
        osc.start(now);
        return osc;
      });

      // ADSR: 0'dan level'a A sürede çık, sonra sustain seviyesine yumuşakça in
      amp.gain.setValueAtTime(0, now);
      amp.gain.linearRampToValueAtTime(level, now + p.attack);
      amp.gain.setTargetAtTime(level * p.sustain, now + p.attack, p.decay / 3);

      this.voices.push({ oscs, amp });
    }
  }

  releaseAll() {
    const { release } = PATCHES[this.patch];
    const now = this.ctx.currentTime;

    for (const { oscs, amp } of this.voices) {
      // Ses o an hangi seviyedeyse oradan sıfıra insin (ani kesilirse "tık" sesi çıkar)
      const current = amp.gain.value;
      amp.gain.cancelScheduledValues(now);
      amp.gain.setValueAtTime(current, now);
      amp.gain.setTargetAtTime(0, now, release / 4);
      oscs.forEach((osc) => osc.stop(now + release + 0.2)); // söndükten sonra durdur, bellek boşalsın
    }
    this.voices = [];
  }

  /** Sentetik oda yankısı: zamanla sönen stereo gürültü. */
  private createImpulse(seconds: number): AudioBuffer {
    const length = Math.floor(this.ctx.sampleRate * seconds);
    const buffer = this.ctx.createBuffer(2, length, this.ctx.sampleRate);
    for (let channel = 0; channel < 2; channel++) {
      const data = buffer.getChannelData(channel);
      for (let i = 0; i < length; i++) {
        data[i] = (Math.random() * 2 - 1) * (1 - i / length) ** 3;
      }
    }
    return buffer;
  }
}