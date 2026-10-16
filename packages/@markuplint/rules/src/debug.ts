import debug from 'debug';

export type Log = debug.Debugger;

/**
 * Enable by setting `DEBUG` to include `ml-rules` (e.g. `DEBUG=ml-rules`).
 *
 * Read `.enabled` at call time; never cache it at module load. `debug.enable()` (including via `verbosely()` /
 * `enableDebug()`) can switch a namespace on after import.
 */
export const log = debug('ml-rules');
