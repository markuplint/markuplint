import type { Log } from '../debug.js';

import color from 'ansi-colors';

import { log } from '../debug.js';

/**
 * Debug logger scoped to the content-model validation module.
 * Extends the parent rule logger with a `content-model` namespace
 * for structured debug output during content model evaluation.
 */
export const cmLog: Log = log.extend('content-model');

const depthLogs = new Map<string, Log>();

/**
 * Returns the `cmLog` child logger for `<name>#<depth>`, created once per
 * name and depth. `debug`'s `extend()` allocates a logger on every call,
 * which showed up in profiles when it ran per recursion step. Use this instead
 * of calling `cmLog.extend()` for per-depth names.
 *
 * The cache is bounded by the number of distinct name × depth pairs. The returned
 * logger is shared by every caller, so setting `.enabled` or `.log` on it affects
 * all of them.
 *
 * Keep in sync with `debug.browser.ts`: `package.json` swaps that file in for this
 * one in the browser build.
 *
 * @param name - The logger's base name, e.g. `order`.
 * @param depth - The recursion depth the logger belongs to.
 * @returns The shared child logger for `<name>#<depth>`.
 */
export function depthLog(name: string, depth: number): Log {
	const key = `${name}#${depth}`;
	let logger = depthLogs.get(key);
	if (!logger) {
		logger = cmLog.extend(key);
		depthLogs.set(key, logger);
	}
	return logger;
}

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
