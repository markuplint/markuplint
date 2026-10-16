import type { Log } from '../debug.js';

import { log } from '../debug.js';

/**
 * Debug logger scoped to the content-model validation module (browser build).
 * Extends the parent rule logger with a `content-model` namespace.
 * In the browser environment, color helpers are no-op stubs.
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
 * Keep in sync with `debug.ts`: `package.json` swaps this file in for that one in
 * the browser build.
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
