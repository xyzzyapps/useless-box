/**
 * Fully synthesized mechanical sound design. No audio assets are downloaded.
 *
 * The servo voices avoid sawtooth oscillators and high-Q pitched filters. A
 * motor is built from filtered gearbox noise, a quiet low-frequency hum, a
 * faint electronic whine, randomized gear chatter, and dry start/stop clicks.
 */

const MASTER_GAIN = 0.44;

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
    // A cue may be scheduled while the context is resuming from the first
    // gesture. Web Audio starts it as soon as resume() completes.

    switch (name) {
      case 'switch:on':
        this._switchClick({
          gain: 0.13,
          brightness: 3100,
          body: 158,
          metal: 0.008,
        });
        break;
      case 'latch:click':
        this._switchClick({
          gain: 0.06,
          brightness: 1750,
          body: 118,
          metal: 0.003,
        });
        this._switchClick({
          when: 0.045,
          gain: 0.042,
          brightness: 2550,
          body: 142,
          metal: 0.002,
        });
        break;
      case 'lid:open':
        this._motor({
          duration: 0.95,
          speed: 0.58,
          load: 0.72,
          gain: 0.068,
          direction: 1,
          chatter: 0.7,
          chirp: 0.9,
        });
        this._hinge({ duration: 0.7, gain: 0.016, direction: 1 });
        break;
      case 'arm:rise':
        this._motor({
          duration: 0.5,
          speed: 1.0,
          load: 0.55,
          gain: 0.062,
          direction: 1,
          chatter: 1,
          chirp: 0.8,
        });
        break;
      case 'arm:reach':
        this._motor({
          duration: 0.56,
          speed: 1.2,
          load: 0.9,
          gain: 0.058,
          direction: 1,
          chatter: 1.2,
          chirp: 0.6,
        });
        break;
      case 'switch:off':
        this._switchClick({
          gain: 0.14,
          brightness: 3450,
          body: 136,
          metal: 0.011,
        });
        break;
      case 'arm:retract':
        this._motor({
          duration: 0.46,
          speed: 1.02,
          load: 0.55,
          gain: 0.054,
          direction: -1,
          chatter: 0.9,
          chirp: 0.35,
        });
        break;
      case 'lid:close':
        this._motor({
          duration: 0.8,
          speed: 0.65,
          load: 0.55,
          gain: 0.062,
          direction: -1,
          chatter: 0.6,
          chirp: 0.3,
        });
        this._hinge({ duration: 0.55, gain: 0.012, direction: -1 });
        break;
      case 'thunk':
        this._thunk();
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
    compressor.threshold.value = -20;
    compressor.knee.value = 16;
    compressor.ratio.value = 4;
    compressor.attack.value = 0.003;
    compressor.release.value = 0.22;

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

  _noiseSource() {
    const source = this.ctx.createBufferSource();
    source.buffer = this.noiseBuffer;
    source.loop = true;
    return source;
  }

  /**
   * A dry, short noise grain. This is the core texture of the gearbox,
   * latch ticks, hinge stick-slip, and switch contacts.
   */
  _grain({ when = 0, duration = 0.004, gain = 0.02, brightness = 2400, q = 1 } = {}) {
    if (!this.noiseBuffer) return;
    const ctx = this.ctx;
    const start = ctx.currentTime + Math.max(0, when);
    const end = start + Math.max(0.002, duration);
    const attack = Math.min(0.0008, duration * 0.25);

    const source = this._noiseSource();
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(Math.min(16000, Math.max(80, brightness)), start);
    filter.Q.setValueAtTime(Math.max(0.2, q), start);

    const amp = ctx.createGain();
    amp.gain.setValueAtTime(0.0001, start);
    amp.gain.exponentialRampToValueAtTime(Math.max(0.0002, gain), start + attack);
    amp.gain.exponentialRampToValueAtTime(0.0001, end);

    source.connect(filter);
    filter.connect(amp);
    amp.connect(this.input);
    source.start(start);
    source.stop(end + 0.006);
  }

  /**
   * A dry electromechanical toggle: impact noise, a small low body, a brief
   * inharmonic metal tick, and a rebound tick. No musical oscillator sweep.
   */
  _switchClick({ when = 0, gain = 0.1, brightness = 3000, body = 150, metal = 0.006 } = {}) {
    this._grain({ when, duration: 0.018, gain, brightness, q: 0.75 });
    this._grain({
      when: when + 0.011,
      duration: 0.028,
      gain: gain * 0.33,
      brightness: brightness * 0.55,
      q: 1.05,
    });
    this._tone({
      when,
      freq: body,
      endFreq: body * 0.55,
      duration: 0.055,
      gain: gain * 0.55,
      type: 'sine',
      attack: 0.001,
      filterFreq: 480,
      filterQ: 0.7,
    });
    this._tone({
      when,
      freq: 2350 + Math.random() * 550,
      duration: 0.012,
      gain: metal,
      type: 'sine',
      attack: 0.0005,
      filterFreq: 5200,
      filterQ: 0.4,
    });
    this._grain({
      when: when + 0.03,
      duration: 0.005,
      gain: gain * 0.12,
      brightness: 1900,
      q: 1.2,
    });
  }

  /**
   * Main servo voice. The whir is noise through broadly tuned filters, pulsed
   * by a low-rate tremolo. Gear chatter and start/stop clicks carry the
   * mechanical character; the only tonal parts are quiet low hum and a faint
   * electronic whine.
   */
  _motor({
    when = 0,
    duration = 0.6,
    speed = 1,
    load = 0.6,
    gain = 0.06,
    direction = 1,
    chatter = 1,
    chirp = 1,
  }) {
    const ctx = this.ctx;
    const start = ctx.currentTime + Math.max(0, when);
    const stop = start + Math.max(0.18, duration);
    const rateStart = speed * (direction >= 0 ? 0.9 : 1.1);
    const rateEnd = speed * (direction >= 0 ? 1.08 : 0.84);

    const whirCenterStart = 760 + rateStart * 560;
    const whirCenterEnd = 760 + rateEnd * 560;
    const attack = 0.025;
    const release = Math.min(0.12, Math.max(0.04, duration * 0.22));

    // Broad gearbox whir.
    const whir = this._noiseSource();
    const band = ctx.createBiquadFilter();
    band.type = 'bandpass';
    band.Q.setValueAtTime(0.72, start);
    band.frequency.setValueAtTime(whirCenterStart, start);
    band.frequency.exponentialRampToValueAtTime(Math.max(120, whirCenterEnd), stop);

    const highpass = ctx.createBiquadFilter();
    highpass.type = 'highpass';
    highpass.frequency.setValueAtTime(280, start);
    highpass.Q.setValueAtTime(0.5, start);

    const tremolo = ctx.createGain();
    tremolo.gain.setValueAtTime(0.7, start);
    const lfo = ctx.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.setValueAtTime(18 + rateStart * 18, start);
    lfo.frequency.linearRampToValueAtTime(18 + rateEnd * 18, stop);
    const lfoDepth = ctx.createGain();
    lfoDepth.gain.setValueAtTime(0.24, start);
    lfo.connect(lfoDepth);
    lfoDepth.connect(tremolo.gain);

    const whirAmp = ctx.createGain();
    whirAmp.gain.setValueAtTime(0.0001, start);
    whirAmp.gain.exponentialRampToValueAtTime(gain, start + attack);
    whirAmp.gain.setValueAtTime(gain, Math.max(start + attack, stop - release));
    whirAmp.gain.exponentialRampToValueAtTime(0.0001, stop);

    whir.connect(band);
    band.connect(highpass);
    highpass.connect(tremolo);
    tremolo.connect(whirAmp);
    whirAmp.connect(this.input);
    whir.start(start);
    whir.stop(stop + 0.03);
    lfo.start(start);
    lfo.stop(stop + 0.03);

    // A thin high-frequency gear hiss above the main whir.
    const hiss = this._noiseSource();
    const hissFilter = ctx.createBiquadFilter();
    hissFilter.type = 'bandpass';
    hissFilter.Q.setValueAtTime(0.52, start);
    hissFilter.frequency.setValueAtTime(3200 + rateStart * 380, start);
    hissFilter.frequency.linearRampToValueAtTime(3200 + rateEnd * 380, stop);
    const hissAmp = ctx.createGain();
    hissAmp.gain.setValueAtTime(0.0001, start);
    hissAmp.gain.exponentialRampToValueAtTime(gain * 0.2, start + attack);
    hissAmp.gain.setValueAtTime(gain * 0.2, Math.max(start + attack, stop - release));
    hissAmp.gain.exponentialRampToValueAtTime(0.0001, stop);
    hiss.connect(hissFilter);
    hissFilter.connect(hissAmp);
    hissAmp.connect(this.input);
    hiss.start(start);
    hiss.stop(stop + 0.03);

    // Quiet low motor hum, with a weak harmonic.
    const humStart = (58 + speed * 16) * rateStart;
    const humEnd = (58 + speed * 16) * rateEnd;
    this._drone({
      start,
      stop,
      freqStart: humStart,
      freqEnd: humEnd,
      gain: gain * 0.45,
      type: 'sine',
      filterFreq: 190,
      attack: 0.035,
      release,
    });
    this._drone({
      start,
      stop,
      freqStart: humStart * 2,
      freqEnd: humEnd * 2,
      gain: gain * 0.075,
      type: 'triangle',
      filterFreq: 420,
      attack: 0.04,
      release,
    });

    // Two layers of electronic servo whine. The upper layer is deliberately
    // shrill and fax-like, but kept short and quiet enough to sit behind the
    // gearbox texture.
    this._drone({
      start,
      stop,
      freqStart: 1250 + speed * 420,
      freqEnd: 1280 + speed * 420,
      gain: gain * 0.11,
      type: 'triangle',
      filterFreq: 5200,
      attack: 0.06,
      release,
    });
    this._drone({
      start,
      stop,
      freqStart: 2150 + speed * 520,
      freqEnd: 2200 + speed * 520,
      gain: gain * 0.045,
      type: 'sine',
      filterFreq: 8000,
      attack: 0.09,
      release,
    });

    // A short fax-handshake warble at the start of the movement. Two high
    // carriers are gated by a fast sine LFO; the result is intentionally more
    // electronic than musical.
    if (chirp > 0) {
      this._faxChirp({
        when: when + 0.012,
        duration: 0.14 + Math.min(0.06, duration * 0.05),
        gain: gain * 0.32 * chirp,
        direction,
      });
    }

    // Start contact and current surge.
    this._grain({
      when: when + 0.002,
      duration: 0.012,
      gain: gain * 0.5,
      brightness: 4200,
      q: 0.8,
    });
    this._tone({
      when,
      freq: 60,
      endFreq: 48,
      duration: 0.05,
      gain: gain * 0.25,
      type: 'sine',
      attack: 0.002,
      filterFreq: 140,
      filterQ: 0.7,
    });

    // Randomized gear chatter. This is what makes the whir mechanical instead
    // of continuous electronic noise.
    const tickCount = Math.max(
      2,
      Math.round((4 + load * 10) * speed * Math.max(0.18, duration) * chatter),
    );
    for (let i = 0; i < tickCount; i += 1) {
      const t = 0.035 + Math.random() * Math.max(0.02, duration - 0.095);
      this._grain({
        when: when + t,
        duration: 0.0025 + Math.random() * 0.005,
        gain: gain * (0.05 + Math.random() * 0.1),
        brightness: 1500 + Math.random() * 2600,
        q: 0.9 + Math.random() * 0.5,
      });
    }

    // End-of-travel tick and gear lash.
    this._grain({
      when: when + duration - 0.02,
      duration: 0.009,
      gain: gain * 0.3,
      brightness: 2350 + Math.random() * 1200,
      q: 1,
    });
    this._tone({
      when: when + duration - 0.015,
      freq: 62,
      endFreq: 42,
      duration: 0.04,
      gain: gain * 0.16,
      type: 'sine',
      attack: 0.002,
      filterFreq: 160,
      filterQ: 0.7,
    });
  }

  _faxChirp({ when = 0, duration = 0.16, gain = 0.018, direction = 1 } = {}) {
    const ctx = this.ctx;
    const start = ctx.currentTime + Math.max(0, when);
    const end = start + Math.max(0.06, duration);
    const base = 2050 + Math.random() * 220;

    const mix = ctx.createGain();
    mix.gain.setValueAtTime(0.55, start);
    const highpass = ctx.createBiquadFilter();
    highpass.type = 'highpass';
    highpass.frequency.setValueAtTime(1100, start);
    highpass.Q.setValueAtTime(0.6, start);

    const envelope = ctx.createGain();
    envelope.gain.setValueAtTime(0.0001, start);
    envelope.gain.exponentialRampToValueAtTime(Math.max(0.0002, gain), start + 0.012);
    envelope.gain.exponentialRampToValueAtTime(0.0001, end);

    const gate = ctx.createGain();
    gate.gain.setValueAtTime(0.5, start);
    const gateLfo = ctx.createOscillator();
    gateLfo.type = 'sine';
    gateLfo.frequency.setValueAtTime(34 + Math.random() * 12, start);
    const gateDepth = ctx.createGain();
    gateDepth.gain.setValueAtTime(0.5, start);
    gateLfo.connect(gateDepth);
    gateDepth.connect(gate.gain);

    for (const [ratio, amount] of [
      [1, 0.8],
      [1.48, 0.35],
    ]) {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      const f0 = base * ratio;
      const f1 = f0 * (direction >= 0 ? 1.13 : 0.87);
      osc.frequency.setValueAtTime(f0, start);
      osc.frequency.linearRampToValueAtTime(f1, end);
      const level = ctx.createGain();
      level.gain.setValueAtTime(amount, start);
      osc.connect(level);
      level.connect(mix);
      osc.start(start);
      osc.stop(end + 0.02);
    }

    mix.connect(highpass);
    highpass.connect(envelope);
    envelope.connect(gate);
    gate.connect(this.input);
    gateLfo.start(start);
    gateLfo.stop(end + 0.02);
  }

  /**
   * Filtered-noise hinge friction with irregular granulation. The filter Q is
   * kept low so it cannot turn into a pitched squeal.
   */
  _hinge({ when = 0, duration = 0.6, gain = 0.016, direction = 1 } = {}) {
    const ctx = this.ctx;
    const start = ctx.currentTime + Math.max(0, when);
    const end = start + Math.max(0.1, duration);
    const attack = 0.05;
    const release = 0.1;

    const source = this._noiseSource();
    const band = ctx.createBiquadFilter();
    band.type = 'bandpass';
    band.Q.setValueAtTime(0.55, start);
    band.frequency.setValueAtTime(direction >= 0 ? 380 : 520, start);
    band.frequency.linearRampToValueAtTime(direction >= 0 ? 520 : 380, end);

    const lowpass = ctx.createBiquadFilter();
    lowpass.type = 'lowpass';
    lowpass.frequency.setValueAtTime(1800, start);
    lowpass.Q.setValueAtTime(0.4, start);

    const modulation = ctx.createGain();
    modulation.gain.setValueAtTime(0.68, start);
    const lfo = ctx.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.setValueAtTime(6.5 + Math.random() * 3.5, start);
    const lfoDepth = ctx.createGain();
    lfoDepth.gain.setValueAtTime(0.3, start);
    lfo.connect(lfoDepth);
    lfoDepth.connect(modulation.gain);

    const amp = ctx.createGain();
    amp.gain.setValueAtTime(0.0001, start);
    amp.gain.exponentialRampToValueAtTime(gain, start + attack);
    amp.gain.setValueAtTime(gain, Math.max(start + attack, end - release));
    amp.gain.exponentialRampToValueAtTime(0.0001, end);

    source.connect(band);
    band.connect(lowpass);
    lowpass.connect(modulation);
    modulation.connect(amp);
    amp.connect(this.input);
    source.start(start);
    source.stop(end + 0.03);
    lfo.start(start);
    lfo.stop(end + 0.03);

    const grains = 3 + Math.floor(duration * 8);
    for (let i = 0; i < grains; i += 1) {
      this._grain({
        when: when + Math.random() * duration * 0.85,
        duration: 0.004 + Math.random() * 0.008,
        gain: gain * (0.35 + Math.random() * 0.65),
        brightness: 500 + Math.random() * 1300,
        q: 0.7 + Math.random() * 0.4,
      });
    }
  }

  _thunk() {
    this._tone({
      freq: 78,
      endFreq: 42,
      duration: 0.28,
      gain: 0.2,
      type: 'sine',
      attack: 0.002,
      filterFreq: 260,
      filterQ: 0.7,
    });
    this._noise({
      duration: 0.14,
      gain: 0.055,
      filterType: 'lowpass',
      filterFreq: 320,
      filterQ: 0.7,
      attack: 0.002,
    });
    this._grain({ when: 0.018, duration: 0.006, gain: 0.012, brightness: 1850, q: 0.8 });
    this._grain({ when: 0.052, duration: 0.005, gain: 0.008, brightness: 2500, q: 1 });
  }

  _drone({
    start,
    stop,
    freqStart,
    freqEnd,
    gain,
    type = 'sine',
    filterFreq = 600,
    attack = 0.03,
    release = 0.1,
  }) {
    const ctx = this.ctx;
    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(Math.max(20, freqStart), start);
    osc.frequency.exponentialRampToValueAtTime(Math.max(20, freqEnd), stop);

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(filterFreq, start);
    filter.Q.setValueAtTime(0.5, start);

    const amp = ctx.createGain();
    amp.gain.setValueAtTime(0.0001, start);
    amp.gain.exponentialRampToValueAtTime(Math.max(0.0002, gain), start + attack);
    amp.gain.setValueAtTime(
      Math.max(0.0002, gain),
      Math.max(start + attack + 0.001, stop - release),
    );
    amp.gain.exponentialRampToValueAtTime(0.0001, stop);

    osc.connect(filter);
    filter.connect(amp);
    amp.connect(this.input);
    osc.start(start);
    osc.stop(stop + 0.02);
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

    const source = this._noiseSource();
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
}
