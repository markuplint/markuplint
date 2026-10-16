import debug from 'debug';

export type Log = debug.Debugger;

/**
 * Enable by setting `DEBUG` to include `ml-rules` (e.g. `DEBUG=ml-rules`).
 *
 * Read `.enabled` at call time; never cache it at module load. `debug.enable()` (including via `verbosely()` /
 * `enableDebug()`) can switch a namespace on after import. The `permitted-contents` functions read it once on entry to
 * decide whether to build log arguments. Enabling debug while one runs is not seen until the next call; disabling
 * takes effect at once because the logger itself re-checks.
 */
export const log = debug('ml-rules');
