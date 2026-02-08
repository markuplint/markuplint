import type { Log } from '../debug.js';

import { log } from '../debug.js';

/**
 * Debug logger scoped to the content-model validation module (browser build).
 * Extends the parent rule logger with a `content-model` namespace.
 * In the browser environment, color helpers are no-op stubs.
 */
export const cmLog: Log = log.extend('content-model');

const fn = () => {};
fn.bold = () => {};

/** No-op color stub for browser environments: green background. */
export const bgGreen = fn;

/** No-op color stub for browser environments: green foreground. */
export const green = fn;

/** No-op color stub for browser environments: red background. */
export const bgRed = fn;

/** No-op color stub for browser environments: blue background. */
export const bgBlue = fn;

/** No-op color stub for browser environments: blue foreground. */
export const blue = fn;

/** No-op color stub for browser environments: magenta background. */
export const bgMagenta = fn;

/** No-op color stub for browser environments: cyan foreground. */
export const cyan = fn;
