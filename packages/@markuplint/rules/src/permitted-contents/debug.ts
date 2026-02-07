import type { Log } from '../debug.js';

import color from 'ansi-colors';

import { log } from '../debug.js';

/**
 * Debug logger scoped to the content-model validation module.
 * Extends the parent rule logger with a `content-model` namespace
 * for structured debug output during content model evaluation.
 */
export const cmLog: Log = log.extend('content-model');

/** ANSI color helper: green background for highlighting locked-and-matched nodes in debug output. */
export const bgGreen = color.bgGreen;

/** ANSI color helper: green foreground for highlighting matched nodes in debug output. */
export const green = color.green;

/** ANSI color helper: red background for highlighting unexpected/extra nodes in debug output. */
export const bgRed = color.bgRed;

/** ANSI color helper: blue background for highlighting locked-and-matched transparent nodes in debug output. */
export const bgBlue = color.bgBlue;

/** ANSI color helper: blue foreground for highlighting matched transparent nodes in debug output. */
export const blue = color.blue;

/** ANSI color helper: magenta background for highlighting unexpected transparent nodes in debug output. */
export const bgMagenta = color.bgMagenta;

/** ANSI color helper: cyan foreground for highlighting unmatched transparent nodes in debug output. */
export const cyan = color.cyan;
