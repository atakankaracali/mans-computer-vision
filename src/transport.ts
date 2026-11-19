export type StepCallback = (step: number, time: number) => void;

export class Transport {
  bpm = 120;
  private step = 0;
  private nextStepTime = 0;
  private timer: number | undefined;
  private readonly listeners: StepCallback[] = [];

  private static readonly LOOKAHEAD = 0.1;
  private static readonly INTERVAL = 25;

  private readonly ctx: AudioContext;

  constructor(ctx: AudioContext) {
    this.ctx = ctx;
  }
  get stepDuration(): number {
    return 60 / this.bpm / 4;
  }

  get running(): boolean {
    return this.timer !== undefined;
  }

  onStep(callback: StepCallback) {
    this.listeners.push(callback);
  }

  start() {
    if (this.running) return;
    this.step = 0;
    this.nextStepTime = this.ctx.currentTime + 0.05;
    this.timer = window.setInterval(() => this.schedule(), Transport.INTERVAL);
  }

  stop() {
    window.clearInterval(this.timer);
    this.timer = undefined;
  }

  private schedule() {
    while (this.nextStepTime < this.ctx.currentTime + Transport.LOOKAHEAD) {
      for (const callback of this.listeners)
        callback(this.step, this.nextStepTime);
      this.nextStepTime += this.stepDuration;
      this.step = (this.step + 1) % 16;
    }
  }
}
