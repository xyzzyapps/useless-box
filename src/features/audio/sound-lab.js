const CUE_BUTTONS = [
  { cue: 'switch:on', label: 'on', title: 'Switch on' },
  { cue: 'latch:click', label: 'latch', title: 'Latch click' },
  { cue: 'lid:open', label: 'open', title: 'Lid opens' },
  { cue: 'arm:rise', label: 'rise', title: 'Arm rises' },
  { cue: 'arm:reach', label: 'reach', title: 'Arm reaches' },
  { cue: 'switch:off', label: 'off', title: 'Switch off' },
  { cue: 'arm:retract', label: 'retract', title: 'Arm retracts' },
  { cue: 'lid:close', label: 'close', title: 'Lid closes' },
  { cue: 'thunk', label: 'thunk', title: 'Final thunk' },
];

/**
 * Sound audition panel. Shown by default in the normal Player Card view, hidden
 * by ?soundlab=0, and suppressed in preview/UI-less captures.
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
  const status = make('span', 'soundlab-kicker', 'tap a cue');
  status.setAttribute('role', 'status');
  status.setAttribute('aria-live', 'polite');
  titleGroup.append(status);
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
    button.dataset.label = item.title;
    button.title = item.title;
    button.setAttribute('aria-label', item.title);
    grid.append(button);
  }

  const cycleButton = make('button', 'soundlab-cycle', 'Play full cycle');
  cycleButton.type = 'button';
  cycleButton.dataset.cue = 'cycle';
  cycleButton.dataset.label = 'full cycle';

  container.replaceChildren(head, grid, cycleButton);

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
      status.textContent = 'muted';
      return;
    }

    if (cue === 'cycle') {
      const started = typeof onCycle === 'function' ? onCycle() : false;
      status.textContent = started ? 'playing cycle' : 'cycle busy';
      return;
    }

    audio.playCue(cue);
    status.textContent = `playing ${button.dataset.label || cue}`;
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
