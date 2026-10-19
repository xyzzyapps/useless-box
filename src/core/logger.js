/**
 * Tiny logging facade. Debug logs are enabled with ?debug=1 and are intentionally
 * verbose around state transitions, audio cues, and scene lifecycle events.
 */

export function createLogger(scope, debugEnabled = false) {
  const prefix = `[useless-box:${scope}]`;

  return {
    debug(...args) {
      if (debugEnabled) console.debug(prefix, ...args);
    },
    info(...args) {
      if (debugEnabled) console.info(prefix, ...args);
    },
    warn(...args) {
      console.warn(prefix, ...args);
    },
    error(...args) {
      console.error(prefix, ...args);
    },
  };
}
