import specs from '@markuplint/html-spec';
import { createTestElement } from '@markuplint/ml-core';
import { afterEach, expect, test, vi } from 'vitest';

import { depthLog } from './debug.js';
import { order } from './order.js';
import { Collection } from './utils.js';

afterEach(() => {
	vi.restoreAllMocks();
});

/**
 * `depthLog()` hands out one shared logger per name and depth, and a test that sets `.enabled` / `.log` on it
 * would leak that into every later caller. Each test therefore runs `order()` at a depth of its own.
 */
function run(depth: number) {
	const el = createTestElement('<div><a></a><b></b></div>');
	return order([{ require: 'a' }, { require: 'b' }], [...el.childNodes], [], specs, {}, depth, 'pretended');
}

test('[permitted-contents-valid-004] depthLog returns one logger per name and depth', () => {
	const first = depthLog('order', 7);

	expect(depthLog('order', 7)).toBe(first);
	expect(depthLog('order', 8)).not.toBe(first);
	expect(depthLog('choice', 7)).not.toBe(first);
	expect(first.namespace).toBe('ml-rules:content-model:order#7');
});

test('[permitted-contents-valid-005] a disabled logger does not build its arguments', () => {
	const depth = 90;
	depthLog('order', depth).enabled = false;
	const toString = vi.spyOn(Collection.prototype, 'toString');

	expect(run(depth).type).toBe('MATCHED');
	expect(toString).not.toHaveBeenCalled();
});

test('[permitted-contents-valid-006] an enabled logger still emits its output', () => {
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
