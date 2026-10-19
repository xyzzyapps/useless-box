import {
  CYCLE_DURATION,
  CycleTimeline,
  sampleCycle,
} from '../features/box/cycle.js';
import { createBoxScene } from '../features/box/scene.js';
import { AudioEngine } from '../features/audio/audio-engine.js';
import { mountSoundLab } from '../features/audio/sound-lab.js';
import { InputController } from '../features/interaction/input-controller.js';
import { InteractionMachine, InteractionState } from '../core/interaction-machine.js';
import { createLogger } from '../core/logger.js';

/**
 * Composition root. Wires the interaction state machine, deterministic cycle
 * timeline, Three.js scene, pointer input, and synthesized audio together.
 */
export class UselessBoxApp {
  constructor({
    canvas,
    stage,
    hint,
    status,
    soundButton,
    debug = false,
    stillTime = null,
    hideUi = false,
    reducedMotion = false,
    soundLab = null,
  }) {
    this.canvas = canvas;
    this.stage = stage;
    this.hint = hint;
    this.status = status;
    this.soundButton = soundButton;
    this.debug = debug;
    this.still = Number.isFinite(stillTime);
    this.stillTime = this.still ? stillTime : null;
    this.reducedMotion = reducedMotion;
    this.hideUi = hideUi;
    this.logger = createLogger('app', debug);

    this.pointerX = 0;
    this.pointerY = 0;
    this.hovered = false;
    this.lastTime = null;
    this.raf = null;
    this.hintTimer = null;
    this.resizeObserver = null;
    this.soundLab = null;

    this.idlePose = sampleCycle(0);
    this.machine = new InteractionMachine({
      onTransition: (event) => this.logger.debug('state', event.from, '->', event.to, event.event),
    });
    this.timeline = new CycleTimeline();
    this.audio = new AudioEngine({ logger: this.logger });
    this.scene = createBoxScene({
      canvas,
      logger: this.logger,
      reducedMotion,
    });

    this._onPointerMove = this._onPointerMove.bind(this);
    this._onPointerLeave = this._onPointerLeave.bind(this);
    this._onResize = this._onResize.bind(this);
    this._onVisibilityChange = this._onVisibilityChange.bind(this);
    this._onSoundClick = this._onSoundClick.bind(this);

    if (hideUi) document.body.classList.add('is-still');
    this._renderSoundState();

    if (this.still) this._primeStillPose();
    else this.scene.applyIdlePose(this.idlePose);

    this._bindUi();
    if (soundLab) {
      this.soundLab = mountSoundLab({
        container: soundLab,
        audio: this.audio,
        onCycle: () => this.trigger('soundlab'),
        logger: this.logger,
      });
    }
    this._bindResize();
    this._resize();
    this._startLoop();
    this.logger.info('app initialized', `three=${this.scene.renderer.info.render.frame}`);
  }

  trigger(source = 'programmatic') {
    if (this.still) return false;
    this.audio.unlock();
    if (!this.machine.trigger()) {
      this.logger.debug('trigger ignored while running', source);
      return false;
    }

    this.timeline.start();
    this._consumeCues();
    this.scene.applyPose(this.timeline.sample());
    this._hideHint();
    this._setBusy(true);
    this._setStatus('Switch pushed. The box is opening.');
    this.input?.setEnabled(false);
    this.logger.info('cycle started', source);
    return true;
  }

  dispose() {
    this._stopLoop();
    this._clearHintTimer();
    window.clearTimeout(this.hintTimer);
    this.input?.dispose();
    this.soundLab?.dispose();
    window.removeEventListener('pointermove', this._onPointerMove);
    window.removeEventListener('pointerleave', this._onPointerLeave);
    window.removeEventListener('resize', this._onResize);
    document.removeEventListener('visibilitychange', this._onVisibilityChange);
    this.soundButton?.removeEventListener('click', this._onSoundClick);
    this.resizeObserver?.disconnect();
    this.audio.dispose();
    this.scene.dispose();
  }

  _bindUi() {
    this.canvas.addEventListener('pointermove', this._onPointerMove, { passive: true });
    this.canvas.addEventListener('pointerleave', this._onPointerLeave, { passive: true });
    document.addEventListener('visibilitychange', this._onVisibilityChange);
    this.soundButton?.addEventListener('click', this._onSoundClick);

    if (!this.soundButton) return;
    if (!this.audio.supported) {
      this.soundButton.disabled = true;
      this.soundButton.setAttribute('aria-label', 'Sound is not supported in this browser');
      this.soundButton.title = 'Sound is not supported in this browser';
    }

    if (!this.still) {
      this.input = new InputController({
        canvas: this.canvas,
        camera: this.scene.camera,
        hitTargets: this.scene.model.hitTargets,
        onActivate: (source) => this.trigger(source),
        onHoverChange: (hovered) => {
          this.hovered = hovered;
        },
        onFirstGesture: () => {
          this.audio.unlock();
        },
        logger: this.logger,
      });
    }
  }

  _bindResize() {
    window.addEventListener('resize', this._onResize, { passive: true });
    if (typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(() => this._onResize());
      this.resizeObserver.observe(this.stage ?? this.canvas.parentElement ?? this.canvas);
    }
  }

  _onResize() {
    this._resize();
  }

  _resize() {
    const width = this.stage?.clientWidth || this.canvas.clientWidth || window.innerWidth;
    const height = this.stage?.clientHeight || this.canvas.clientHeight || window.innerHeight;
    this.scene.resize(width, height, window.devicePixelRatio || 1);
    if (this.still) {
      this._renderStillFrame();
    }
  }

  _primeStillPose() {
    const pose = sampleCycle(this.stillTime ?? 0);
    this.scene.applyPose(pose);
    for (let i = 0; i < 600; i += 1) {
      this.scene.update(1 / 60, {
        pointerX: 0,
        pointerY: 0,
        hovered: false,
        idle: false,
        still: true,
      });
    }
    this.scene.applyPose(pose);
    this.logger.debug('still pose primed', this.stillTime);
  }

  _renderStillFrame() {
    this.scene.update(1 / 60, {
      pointerX: 0,
      pointerY: 0,
      hovered: false,
      idle: false,
      still: true,
    });
    this.scene.render();
  }

  _startLoop() {
    this.lastTime = null;

    if (this.still) {
      this._renderStillFrame();
      document.documentElement.dataset.ready = 'true';
      window.__UB_READY__ = true;
      return;
    }

    const frame = (time) => {
      this.raf = window.requestAnimationFrame(frame);
      if (this.lastTime == null) this.lastTime = time;
      const dt = Math.min(0.05, Math.max(0, (time - this.lastTime) / 1000));
      this.lastTime = time;
      this._step(dt);
      this.scene.render();
      if (!document.documentElement.dataset.ready) {
        document.documentElement.dataset.ready = 'true';
        window.__UB_READY__ = true;
        this.logger.debug('first rendered frame');
      }
    };
    this.raf = window.requestAnimationFrame(frame);
  }

  _stopLoop() {
    if (this.raf != null) window.cancelAnimationFrame(this.raf);
    this.raf = null;
  }

  _step(dt) {
    if (this.machine.state === InteractionState.RUNNING) {
      this.timeline.update(dt);
      this._consumeCues();
      this.scene.applyPose(this.timeline.sample());

      if (this.timeline.complete) {
        this.machine.complete();
        this.timeline.playing = false;
        this.scene.applyPose(sampleCycle(CYCLE_DURATION));
        this._setBusy(false);
        this._setStatus('The box turned itself off.');
        this.input?.setEnabled(true);
        this.logger.info('cycle complete');
        this._flashAgainHint();
      }
    }

    this.scene.update(dt, {
      pointerX: this.pointerX,
      pointerY: this.pointerY,
      hovered: this.hovered,
      idle: this.machine.isIdle,
    });

    if (this.input?.hovered) this.input.refreshHover();
  }

  _consumeCues() {
    for (const cue of this.timeline.consumeCues()) {
      this.logger.debug('audio cue', cue.name, `t=${cue.at.toFixed(2)}`);
      this.audio.playCue(cue.name);
    }
  }

  _onPointerMove(event) {
    if (event.pointerType === 'touch') return;
    const rect = this.canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    this.pointerX = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointerY = ((event.clientY - rect.top) / rect.height) * 2 - 1;
  }

  _onPointerLeave() {
    this.pointerX = 0;
    this.pointerY = 0;
  }

  _onVisibilityChange() {
    // A fresh timestamp prevents a backgrounded tab from advancing the cycle in
    // one large jump when requestAnimationFrame resumes.
    this.lastTime = null;
  }

  _onSoundClick() {
    this.audio.unlock();
    this.audio.setMuted(!this.audio.muted);
    this._renderSoundState();
    this._setStatus(this.audio.muted ? 'Sound muted.' : 'Sound on.');
  }

  _renderSoundState() {
    if (!this.soundButton) return;
    const muted = this.audio.muted;
    this.soundButton.classList.toggle('is-muted', muted);
    this.soundButton.setAttribute('aria-pressed', String(muted));
    this.soundButton.setAttribute('aria-label', muted ? 'Unmute sound' : 'Mute sound');
    this.soundButton.title = muted ? 'Unmute sound' : 'Mute sound';
  }

  _setBusy(busy) {
    document.documentElement.dataset.busy = busy ? 'true' : 'false';
    this.canvas.dataset.busy = busy ? 'true' : 'false';
    this.canvas.setAttribute('aria-busy', String(busy));
    this.canvas.setAttribute(
      'aria-label',
      busy
        ? 'The useless box is turning itself off.'
        : 'Push the switch to start the useless box.',
    );
  }

  _setStatus(message) {
    if (this.status) this.status.textContent = message;
  }

  _hideHint() {
    this.hint?.classList.remove('is-visible');
    this._clearHintTimer();
  }

  _flashAgainHint() {
    if (!this.hint) return;
    this._clearHintTimer();
    this.hintTimer = window.setTimeout(() => {
      this.hint.innerHTML = '<span class="hint-accent">again?</span>';
      this.hint.classList.add('is-visible');
      this.hintTimer = window.setTimeout(() => {
        this.hint.classList.remove('is-visible');
      }, 2100);
    }, 650);
  }

  _clearHintTimer() {
    if (this.hintTimer != null) {
      window.clearTimeout(this.hintTimer);
      this.hintTimer = null;
    }
  }
}
