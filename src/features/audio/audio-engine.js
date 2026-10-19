/**
 * Fully synthesized sound design. The page never downloads audio files.
 *
 * Web browsers require a user gesture before audio can start, so the app calls
 * unlock() from the first switch press. Cues are small, deliberately mechanical
 * servo and latch sounds.
 */

const MASTER_GAIN = 0.48;

export class AudioEngine {
  constructor({ muted = false, logger = null } = {}) {
    this.muted = muted;
    this.logger = logger;
    this.ctx = null;
    this.input = null;
    this.master = null;
    this.noiseBuffer = null;
    this.unlocked = false;
  }

  get supported() {
    return (
      typeof window !== 'undefined' &&
      Boolean(window.AudioContext || window.webkitAudioContext)
    );
  }

  async unlock() {
    if (!this.supported) return false;
    if (!this.ctx) this._createContext();
    if (!this.ctx) return false;

    if (this.ctx.state === 'suspended') {
      try {
        await this.ctx.resume();
      } catch (error) {
        this.logger?.warn('audio resume failed', error);
      }
    }

    this.unlocked = this.ctx.state === 'running';
    this.logger?.debug('audio unlocked', this.ctx.state);
    return this.unlocked;
  }

  setMuted(muted) {
    this.muted = Boolean(muted);
    if (!this.master || !this.ctx) return;
    const now = this.ctx.currentTime;
    this.master.gain.cancelScheduledValues(now);
    this.master.gain.setTargetAtTime(this.muted ? 0.0001 : MASTER_GAIN, now, 0.02);
    this.logger?.debug('audio muted', this.muted);
  }

  playCue(name) {
    if (!this.ctx || this.muted || this.ctx.state === 'closed') return;
    // Cues may be scheduled while the context is still resuming from a gesture.
    // Web Audio starts them as soon as resume() completes.

    switch (name) {
      case 'switch:on':
        this._click({ gain: 0.13, pitch: 1250, brightness: 2600 });
        this._tone({
          freq: 720,
          endFreq: 320,
          duration: 0.07,
          gain: 0.045,
          type: 'triangle',
          filterFreq: 3400,
        });
        break;
      case 'latch:click':
        this._click({ gain: 0.085, pitch: 760, brightness: 1800, delay: 0.01 });
        this._click({ gain: 0.055, pitch: 1250, brightness: 2600, delay: 0.055 });
        break;
      case 'lid:open':
        this._servo({
          duration: 0.95,
          startFreq: 92,
          endFreq: 138,
          gain: 0.06,
          filter: 720,
        });
        this._creak({ duration: 0.65, startFreq: 260, endFreq: 120, gain: 0.018 });
        break;
      case 'arm:rise':
        this._servo({
          duration: 0.52,
          startFreq: 155,
          endFreq: 235,
          gain: 0.052,
          filter: 960,
        });
        break;
      case 'arm:reach':
        this._servo({
          duration: 0.58,
          startFreq: 190,
          endFreq: 260,
          gain: 0.05,
          filter: 1100,
        });
        break;
      case 'switch:off':
        this._click({ gain: 0.14, pitch: 940, brightness: 3300 });
        this._tone({
          freq: 390,
          endFreq: 180,
          duration: 0.075,
          gain: 0.05,
          type: 'triangle',
          filterFreq: 2600,
        });
        break;
      case 'arm:retract':
        this._servo({
          duration: 0.46,
          startFreq: 225,
          endFreq: 150,
          gain: 0.044,
          filter: 880,
        });
        break;
      case 'lid:close':
        this._servo({
          duration: 0.78,
          startFreq: 135,
          endFreq: 78,
          gain: 0.055,
          filter: 620,
        });
        this._creak({ duration: 0.5, startFreq: 170, endFreq: 90, gain: 0.014 });
        break;
      case 'thunk':
        this._tone({
          freq: 92,
          endFreq: 42,
          duration: 0.26,
          gain: 0.2,
          type: 'sine',
          filterFreq: 260,
          filterQ: 1.2,
        });
        this._noise({
          duration: 0.16,
          gain: 0.06,
          filterType: 'lowpass',
          filterFreq: 320,
          filterQ: 1.1,
          attack: 0.002,
        });
        break;
      default:
        break;
    }
  }

  dispose() {
    if (this.ctx && this.ctx.state !== 'closed') this.ctx.close();
    this.ctx = null;
    this.master = null;
    this.input = null;
    this.noiseBuffer = null;
  }

  _createContext() {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    try {
      this.ctx = new AudioContextClass({ latencyHint: 'interactive' });
    } catch (error) {
      this.logger?.warn('audio context creation failed', error);
      return;
    }

    const compressor = this.ctx.createDynamicsCompressor();
    compressor.threshold.value = -18;
    compressor.knee.value = 18;
    compressor.ratio.value = 3.5;
    compressor.attack.value = 0.004;
    compressor.release.value = 0.24;

    this.master = this.ctx.createGain();
    this.master.gain.value = this.muted ? 0.0001 : MASTER_GAIN;
    compressor.connect(this.master);
    this.master.connect(this.ctx.destination);
    this.input = compressor;

    const seconds = 1;
    const length = Math.floor(this.ctx.sampleRate * seconds);
    this.noiseBuffer = this.ctx.createBuffer(1, length, this.ctx.sampleRate);
    const channel = this.noiseBuffer.getChannelData(0);
    for (let i = 0; i < length; i += 1) channel[i] = Math.random() * 2 - 1;
  }

  _tone({
    when = 0,
    freq = 300,
    endFreq = null,
    duration = 0.2,
    gain = 0.08,
    type = 'sine',
    attack = 0.005,
    filterFreq = 0,
    filterType = 'lowpass',
    filterQ = 0.8,
  }) {
    const ctx = this.ctx;
    const start = ctx.currentTime + Math.max(0, when);
    const stop = start + duration;
    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(Math.max(20, freq), start);
    if (endFreq) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(20, endFreq), stop);
    }

    const amp = ctx.createGain();
    amp.gain.setValueAtTime(0.0001, start);
    amp.gain.exponentialRampToValueAtTime(Math.max(0.0002, gain), start + attack);
    amp.gain.exponentialRampToValueAtTime(0.0001, stop);

    let output = osc;
    if (filterFreq > 0) {
      const filter = ctx.createBiquadFilter();
      filter.type = filterType;
      filter.frequency.setValueAtTime(filterFreq, start);
      filter.Q.setValueAtTime(filterQ, start);
      osc.connect(filter);
      output = filter;
    }
    output.connect(amp);
    amp.connect(this.input);
    osc.start(start);
    osc.stop(stop + 0.02);
  }

  _noise({
    when = 0,
    duration = 0.1,
    gain = 0.05,
    filterType = 'bandpass',
    filterFreq = 1800,
    filterQ = 1.2,
    attack = 0.003,
  }) {
    if (!this.noiseBuffer) return;
    const ctx = this.ctx;
    const start = ctx.currentTime + Math.max(0, when);
    const stop = start + duration;

    const source = ctx.createBufferSource();
    source.buffer = this.noiseBuffer;
    source.loop = true;

    const filter = ctx.createBiquadFilter();
    filter.type = filterType;
    filter.frequency.setValueAtTime(filterFreq, start);
    filter.Q.setValueAtTime(filterQ, start);

    const amp = ctx.createGain();
    amp.gain.setValueAtTime(0.0001, start);
    amp.gain.exponentialRampToValueAtTime(Math.max(0.0002, gain), start + attack);
    amp.gain.exponentialRampToValueAtTime(0.0001, stop);

    source.connect(filter);
    filter.connect(amp);
    amp.connect(this.input);
    source.start(start);
    source.stop(stop + 0.02);
  }

  _click({ gain = 0.1, pitch = 1600, brightness = 2200, delay = 0 }) {
    this._noise({
      when: delay,
      duration: 0.032,
      gain,
      filterType: 'bandpass',
      filterFreq: brightness,
      filterQ: 1.8,
      attack: 0.001,
    });
    this._tone({
      when: delay,
      freq: pitch,
      endFreq: pitch * 0.45,
      duration: 0.036,
      gain: gain * 0.45,
      type: 'square',
      attack: 0.001,
      filterFreq: brightness * 1.4,
    });
  }

  _servo({ duration = 0.6, startFreq = 120, endFreq = 180, gain = 0.05, filter = 800 }) {
    const ctx = this.ctx;
    const start = ctx.currentTime;
    const stop = start + duration;
    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(startFreq, start);
    osc.frequency.exponentialRampToValueAtTime(Math.max(20, endFreq), stop);

    const lfo = ctx.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.setValueAtTime(18 + Math.random() * 4, start);
    const lfoGain = ctx.createGain();
    lfoGain.gain.setValueAtTime(3.5, start);
    lfo.connect(lfoGain);
    lfoGain.connect(osc.frequency);

    const filterNode = ctx.createBiquadFilter();
    filterNode.type = 'lowpass';
    filterNode.frequency.setValueAtTime(filter, start);
    filterNode.frequency.exponentialRampToValueAtTime(filter * 1.35, stop);
    filterNode.Q.setValueAtTime(2.8, start);

    const amp = ctx.createGain();
    amp.gain.setValueAtTime(0.0001, start);
    amp.gain.exponentialRampToValueAtTime(Math.max(0.0002, gain), start + 0.035);
    amp.gain.setValueAtTime(Math.max(0.0002, gain * 0.72), start + duration * 0.68);
    amp.gain.exponentialRampToValueAtTime(0.0001, stop);

    osc.connect(filterNode);
    filterNode.connect(amp);
    amp.connect(this.input);
    osc.start(start);
    osc.stop(stop + 0.03);
    lfo.start(start);
    lfo.stop(stop + 0.03);

    this._noise({
      duration,
      gain: gain * 0.28,
      filterType: 'bandpass',
      filterFreq: 1100,
      filterQ: 2.3,
      attack: 0.03,
    });
  }

  _creak({ duration = 0.6, startFreq = 240, endFreq = 110, gain = 0.016 }) {
    const ctx = this.ctx;
    const start = ctx.currentTime;
    const stop = start + duration;
    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(startFreq, start);
    osc.frequency.linearRampToValueAtTime(endFreq, stop);

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(520, start);
    filter.frequency.linearRampToValueAtTime(320, stop);
    filter.Q.setValueAtTime(5.5, start);

    const amp = ctx.createGain();
    amp.gain.setValueAtTime(0.0001, start);
    amp.gain.exponentialRampToValueAtTime(gain, start + 0.06);
    amp.gain.exponentialRampToValueAtTime(0.0001, stop);

    osc.connect(filter);
    filter.connect(amp);
    amp.connect(this.input);
    osc.start(start);
    osc.stop(stop + 0.02);
  }
}
