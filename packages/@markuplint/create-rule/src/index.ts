/**
 * @module @markuplint/create-rule
 *
 * Package entry point for the programmatic API behind the `create-rule` CLI
 * (`bin/create-rule.mjs` imports `./cli.js` directly, not this file). Only the
 * scaffold generator, its error class and its parameter/result types are
 * public; the CLI wiring and the file-system helpers are not.
 */

export { createRuleHelper } from './create-rule-helper.js';
export { CreateRuleHelperError } from './create-rule-helper-error.js';
export type * from './types.js';
