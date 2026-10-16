import specs from '@markuplint/html-spec';
import { createTestElement } from '@markuplint/ml-core';
import { parser as svelteParser } from '@markuplint/svelte-parser';
import { afterEach, expect, test, vi } from 'vitest';

import { depthLog as browserDepthLog } from './debug.browser.js';
import { cmLog, depthLog } from './debug.js';
import { order } from './order.js';
import { representTransparentNodes } from './represent-transparent-nodes.js';
import { Collection } from './utils.js';

type Overridable = { enabled: boolean | null; log?: unknown };

/** Loggers a test pinned, so `afterEach` can release them again. */
const pinned: Overridable[] = [cmLog as unknown as Overridable];

/** Pins `enabled` and redirects `log` to a mock; the logger is released in `afterEach`. */
function pin(logger: unknown, enabled: boolean) {
	const target = logger as Overridable;
	const out = vi.fn();
	target.enabled = enabled;
	target.log = out;
	pinned.push(target);
	return out;
}

afterEach(() => {
	vi.restoreAllMocks();
	for (const logger of pinned) {
		// `debug` keeps `enabled = null` as "no override"; any other value, `undefined` included, pins the logger.
		logger.enabled = null;
		delete logger.log;
	}
	pinned.length = 1;
});

/**
 * Eleven conditional siblings push the number of patterns over its cap, which is the only place
 * `represent-transparent-nodes.ts` logs through `cmLog`.
 */
function exceedPatternCap() {
	const tags = Array.from({ length: 11 }, () => '<a href>{#if x}<span>s</span>{/if}</a>').join('');
	const el = createTestElement(`<div>${tags}</div>`, { parser: svelteParser });
	return representTransparentNodes(
		[...el.children],
		[],
		specs,
		{ ignoreHasMutableChildren: true, evaluateConditionalChildNodes: true },
		'pretended',
	);
}

/**
 * `depthLog()` hands out one shared logger per name and depth, and a test that sets `.enabled` / `.log` on it
 * would leak that into every later caller. Each test therefore runs `order()` at a depth of its own.
 */
function run(depth: number) {
	const el = createTestElement('<div><a></a><b></b></div>');
	return order([{ require: 'a' }, { require: 'b' }], [...el.childNodes], [], specs, {}, depth, 'pretended');
}

test('[permitted-contents-debug-001] depthLog returns one logger per name and depth', () => {
	const first = depthLog('order', 7);

	expect(depthLog('order', 7)).toBe(first);
	expect(depthLog('order', 8)).not.toBe(first);
	expect(depthLog('choice', 7)).not.toBe(first);
	expect(first.namespace).toBe('ml-rules:content-model:order#7');
});

test('[permitted-contents-debug-002] a disabled logger does not build its arguments', () => {
	const depth = 90;
	depthLog('order', depth).enabled = false;
	const toString = vi.spyOn(Collection.prototype, 'toString');

	expect(run(depth).type).toBe('MATCHED');
	expect(toString).not.toHaveBeenCalled();
});

test('[permitted-contents-debug-003] an enabled logger still emits its output', () => {
	const depth = 91;
	const orderLog = depthLog('order', depth);
	orderLog.enabled = true;
	const out = vi.fn();
	orderLog.log = out;
	const toString = vi.spyOn(Collection.prototype, 'toString');

	expect(run(depth).type).toBe('MATCHED');
	expect(toString).toHaveBeenCalledWith(true);
	expect(out).toHaveBeenCalled();
});

/**
 * An optional `b` takes the only `<b>` with a zero-match, the required `b` after it then finds nothing and the
 * loop backtracks once. Called at a depth of its own for the same reason as {@link run}.
 */
function runBacktrack(depth: number) {
	const el = createTestElement('<div><b></b></div>');
	return order([{ optional: 'b' }, { require: 'b' }], [...el.childNodes], [], specs, {}, depth, 'pretended');
}

test('[permitted-contents-debug-007] an enabled backtrack logger still emits when order() backtracks', () => {
	const depth = 92;
	const out = pin(depthLog('backtrack', depth), true);

	expect(runBacktrack(depth).type).toBe('MATCHED');
	expect(out).toHaveBeenCalledTimes(1);
	expect(String(out.mock.calls[0]?.[0])).toContain('🔙◀BACK');
});

test('[permitted-contents-debug-008] a disabled backtrack logger writes nothing when order() backtracks', () => {
	const depth = 93;
	const out = pin(depthLog('backtrack', depth), false);

	expect(runBacktrack(depth).type).toBe('MATCHED');
	expect(out).not.toHaveBeenCalled();
});

test('[permitted-contents-debug-004] the browser depthLog returns one logger per name and depth', () => {
	const first = browserDepthLog('order', 7);

	expect(browserDepthLog('order', 7)).toBe(first);
	expect(browserDepthLog('order', 8)).not.toBe(first);
	expect(browserDepthLog('choice', 7)).not.toBe(first);
	expect(first.namespace).toBe('ml-rules:content-model:order#7');
});

test('[permitted-contents-debug-005] the pattern cap writes nothing while cmLog is disabled', () => {
	const out = vi.fn();
	cmLog.enabled = false;
	cmLog.log = out;

	expect(exceedPatternCap()).toHaveLength(1024);
	expect(out).not.toHaveBeenCalled();
});

test('[permitted-contents-debug-006] the pattern cap still logs once cmLog is enabled', () => {
	const out = vi.fn();
	cmLog.enabled = true;
	cmLog.log = out;

	expect(exceedPatternCap()).toHaveLength(1024);
	expect(out).toHaveBeenCalledTimes(1);
	expect(String(out.mock.calls[0]?.[0])).toContain('Transparent pattern cap exceeded on <');
});
