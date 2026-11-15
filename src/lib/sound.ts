class SoundEngine {
  private ctx: AudioContext | null = null;
  private noiseBuffer: AudioBuffer | null = null;
  private lastKeyAt = 0;
  private lastClickAt = 0;

  private getContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      void this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  private getNoiseBuffer(ctx: AudioContext): AudioBuffer {
    if (this.noiseBuffer && this.noiseBuffer.sampleRate === ctx.sampleRate) {
      return this.noiseBuffer;
    }
    const length = Math.floor(ctx.sampleRate * 0.03);
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    this.noiseBuffer = buffer;
    return buffer;
  }

  private playTone(
    freq: number,
    duration: number,
    type: OscillatorType = 'sine',
    gainValue = 0.08,
    delay = 0
  ) {
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.exponentialRampToValueAtTime(gainValue, now + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + duration + 0.02);
  }

  playClick(enabled: boolean) {
    if (!enabled) return;
    const perfNow = typeof performance !== 'undefined' ? performance.now() : Date.now();
    if (perfNow - this.lastClickAt < 30) return;
    this.lastClickAt = perfNow;

    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(740, now);
    osc.frequency.exponentialRampToValueAtTime(320, now + 0.024);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.exponentialRampToValueAtTime(0.032, now + 0.004);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.028);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.035);
  }

  playKey(enabled: boolean, variant: 'char' | 'backspace' | 'space' = 'char') {
    if (!enabled) return;
    const perfNow = typeof performance !== 'undefined' ? performance.now() : Date.now();
    if (perfNow - this.lastKeyAt < 24) return;
    this.lastKeyAt = perfNow;

    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;

    // Subtle soft mechanical transient
    const noise = ctx.createBufferSource();
    noise.buffer = this.getNoiseBuffer(ctx);
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(variant === 'backspace' ? 1200 : 1900, now);
    filter.Q.setValueAtTime(1.4, now);

    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.02, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.014);

    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(ctx.destination);
    noise.start(now);
    noise.stop(now + 0.018);

    // Subtle body resonance with slight pitch variance for organic feel
    const osc = ctx.createOscillator();
    const bodyGain = ctx.createGain();
    const jitter = (Math.random() - 0.5) * 45;

    const startFreq =
      variant === 'backspace'
        ? 360 + jitter * 0.5
        : variant === 'space'
        ? 290 + jitter * 0.4
        : 540 + jitter;
    const endFreq = variant === 'backspace' ? 160 : variant === 'space' ? 140 : 210;

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(startFreq, now);
    osc.frequency.exponentialRampToValueAtTime(endFreq, now + 0.02);

    bodyGain.gain.setValueAtTime(0.001, now);
    bodyGain.gain.exponentialRampToValueAtTime(0.022, now + 0.003);
    bodyGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.024);

    osc.connect(bodyGain);
    bodyGain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.03);
  }

  playCorrect(enabled: boolean) {
    if (!enabled) return;
    this.playTone(587.33, 0.1, 'triangle', 0.07, 0); // D5
    this.playTone(880, 0.14, 'triangle', 0.07, 0.06); // A5
  }

  playWrong(enabled: boolean) {
    if (!enabled) return;
    this.playTone(220, 0.15, 'sawtooth', 0.045, 0);
    this.playTone(174.61, 0.18, 'sawtooth', 0.04, 0.08);
  }

  playFinish(enabled: boolean) {
    if (!enabled) return;
    this.playTone(523.25, 0.12, 'triangle', 0.06, 0);
    this.playTone(659.25, 0.12, 'triangle', 0.06, 0.08);
    this.playTone(783.99, 0.18, 'triangle', 0.07, 0.16);
    this.playTone(1046.5, 0.28, 'triangle', 0.07, 0.24);
  }

  playPromotion(enabled: boolean) {
    if (!enabled) return;
    this.playTone(587.33, 0.11, 'triangle', 0.075, 0); // D5
    this.playTone(739.99, 0.11, 'triangle', 0.075, 0.08); // F#5
    this.playTone(880.0, 0.13, 'triangle', 0.08, 0.16); // A5
    this.playTone(1174.66, 0.34, 'triangle', 0.09, 0.25); // D6
    this.playTone(1760.0, 0.22, 'sine', 0.035, 0.27); // A6 shimmer
  }
}

export const soundEngine = new SoundEngine();
