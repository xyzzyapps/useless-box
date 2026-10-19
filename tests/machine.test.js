import test from 'node:test';
import assert from 'node:assert/strict';

import {
  InteractionMachine,
  InteractionState,
} from '../src/core/interaction-machine.js';

test('interaction machine starts idle and accepts a trigger', () => {
  const events = [];
  const machine = new InteractionMachine({ onTransition: (e) => events.push(e) });

  assert.equal(machine.state, InteractionState.IDLE);
  assert.equal(machine.trigger(), true);
  assert.equal(machine.state, InteractionState.RUNNING);
  assert.deepEqual(events[0], {
    from: InteractionState.IDLE,
    to: InteractionState.RUNNING,
    event: 'trigger',
  });
});

test('interaction machine ignores repeated triggers while running', () => {
  const machine = new InteractionMachine();
  machine.trigger();

  assert.equal(machine.trigger(), false);
  assert.equal(machine.state, InteractionState.RUNNING);
});

test('completion returns the machine to idle and allows another trigger', () => {
  const machine = new InteractionMachine();
  machine.trigger();
  assert.equal(machine.complete(), true);
  assert.equal(machine.state, InteractionState.IDLE);
  assert.equal(machine.trigger(), true);
  assert.equal(machine.state, InteractionState.RUNNING);
});

test('completing an idle machine is a no-op', () => {
  const machine = new InteractionMachine();
  assert.equal(machine.complete(), false);
  assert.equal(machine.state, InteractionState.IDLE);
});
