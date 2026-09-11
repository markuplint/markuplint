import debug from 'debug';

export type Log = debug.Debugger;

/** Enable by setting `DEBUG` to include `ml-rules` (e.g. `DEBUG=ml-rules`). */
export const log = debug('ml-rules');
