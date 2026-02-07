import debug from 'debug';

/**
 * Type alias for the debug logger function provided by the `debug` package.
 * Used throughout the rules package for conditional diagnostic logging.
 */
export type Log = debug.Debugger;

/**
 * Shared debug logger instance for the `@markuplint/rules` package.
 * Enable by setting the `DEBUG` environment variable to include `ml-rules`
 * (e.g. `DEBUG=ml-rules`).
 */
export const log = debug('ml-rules');
