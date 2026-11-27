export class AudioSystem {
  private context: AudioContext | null = null;
  private master: GainNode | null = null;
  private volume = 0.65;

  setVolume(value: number): void {
    this.volume = Math.max(0, Math.min(1, value));
    if (this.master) this.master.gain.setTargetAtTime(this.volume, this.context?.currentTime ?? 0, 0.04);
  }

  private ensureContext(): AudioContext | null {
    try {
      if (!this.context) {
        const Context = window.AudioContext;
        if (!Context) return null;
        this.context = new Context();
        this.master = this.context.createGain();
        this.master.gain.value = this.volume;
        this.master.connect(this.context.destination);
      }
      if (this.context.state === "suspended") void this.context.resume();
      return this.context;
    } catch (error) {
      console.warn("Audio is unavailable in this browser.", error);
      return null;
    }
  }

  playTone(frequency = 520, duration = 0.08): void {
    const context = this.ensureContext();
    if (!context || !this.master || this.volume <= 0) return;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(frequency, context.currentTime);
    gain.gain.setValueAtTime(0.0001, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.11, context.currentTime + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + duration);
    oscillator.connect(gain);
    gain.connect(this.master);
    oscillator.start();
    oscillator.stop(context.currentTime + duration + 0.02);
  }
}
