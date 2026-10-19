const CUE_BUTTONS = [
  { cue: 'switch:on', label: 'switch on' },
  { cue: 'latch:click', label: 'latch' },
  { cue: 'lid:open', label: 'lid open' },
  { cue: 'arm:rise', label: 'arm rise' },
  { cue: 'arm:reach', label: 'arm reach' },
  { cue: 'switch:off', label: 'switch off' },
  { cue: 'arm:retract', label: 'arm retract' },
  { cue: 'lid:close', label: 'lid close' },
  { cue: 'thunk', label: 'thunk' },
];

/**
 * Debug-only sound audition panel. Enabled with ?soundlab=1 and never shown in
 * the normal Player Card view.
 */
export function mountSoundLab({ container, audio, onCycle, logger = null }) {
  if (!container) return null;
  container.hidden = false;

  const make = (tag, className, text) => {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text != null) element.textContent = text;
    return element;
  };

  const head = make('div', 'soundlab-head');
  const titleGroup = make('div', 'soundlab-title-group');
  titleGroup.append(make('strong', 'soundlab-title', 'SOUND LAB'));
  titleGroup.append(make('span', 'soundlab-kicker', 'debug cues'));
  const closeButton = make('button', 'soundlab-close', '\u00d7');
  closeButton.type = 'button';
  closeButton.dataset.action = 'close';
  closeButton.setAttribute('aria-label', 'Close sound lab');
  head.append(titleGroup, closeButton);

  const grid = make('div', 'soundlab-grid');
  for (const item of CUE_BUTTONS) {
    const button = make('button', 'soundlab-cue', item.label);
    button.type = 'button';
    button.dataset.cue = item.cue;
    button.dataset.label = item.label;
    grid.append(button);
  }

  const cycleButton = make('button', 'soundlab-cycle', 'Play full cycle');
  cycleButton.type = 'button';
  cycleButton.dataset.cue = 'cycle';
  cycleButton.dataset.label = 'full cycle';

  const status = make('p', 'soundlab-status', 'Click a cue. The speaker button controls mute.');
  status.setAttribute('aria-live', 'polite');

  container.replaceChildren(head, grid, cycleButton, status);

  const handleClick = async (event) => {
    const button = event.target.closest('button');
    if (!button || !container.contains(button)) return;

    if (button.dataset.action === 'close') {
      container.hidden = true;
      return;
    }

    const cue = button.dataset.cue;
    if (!cue) return;

    try {
      await audio.unlock();
    } catch (error) {
      logger?.warn('sound lab unlock failed', error);
    }

    if (audio.muted) {
      status.textContent = 'Muted. Use the speaker button, then audition again.';
      return;
    }

    if (cue === 'cycle') {
      const started = typeof onCycle === 'function' ? onCycle() : false;
      status.textContent = started ? 'Playing full cycle.' : 'Cycle is already running.';
      return;
    }

    audio.playCue(cue);
    status.textContent = `Playing ${button.dataset.label || cue}.`;
    logger?.debug('sound lab cue', cue);
  };

  container.addEventListener('click', handleClick);
  logger?.debug('sound lab mounted', CUE_BUTTONS.length);

  return {
    dispose() {
      container.removeEventListener('click', handleClick);
      container.hidden = true;
      container.replaceChildren();
    },
  };
}
