/**
 * User-interaction state machine for the useless box.
 *
 * The machine models the only two stable user-facing states: waiting for a
 * push, and running the self-defeating cycle. Clicks during a cycle are
 * deliberately ignored.
 */

export const InteractionState = Object.freeze({
  IDLE: 'idle',
  RUNNING: 'running',
});

const TRANSITIONS = Object.freeze({
  [InteractionState.IDLE]: { trigger: InteractionState.RUNNING },
  [InteractionState.RUNNING]: { complete: InteractionState.IDLE },
});

export class InteractionMachine {
  constructor({ onTransition = null } = {}) {
    this.state = InteractionState.IDLE;
    this.onTransition = onTransition;
  }

  get isIdle() {
    return this.state === InteractionState.IDLE;
  }

  get isRunning() {
    return this.state === InteractionState.RUNNING;
  }

  trigger() {
    return this._send('trigger');
  }

  complete() {
    return this._send('complete');
  }

  reset() {
    if (this.state === InteractionState.IDLE) return;
    this.state = InteractionState.IDLE;
    this._notify({ from: InteractionState.RUNNING, to: InteractionState.IDLE, event: 'reset' });
  }

  _send(event) {
    const next = TRANSITIONS[this.state]?.[event];
    if (!next) return false;

    const from = this.state;
    this.state = next;
    this._notify({ from, to: next, event });
    return true;
  }

  _notify(detail) {
    if (typeof this.onTransition === 'function') this.onTransition(detail);
  }
}
