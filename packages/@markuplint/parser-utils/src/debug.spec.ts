import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import type * as Debugger from './debugger.js';

import { domLog, log } from './debug.js';
import { nodeListToDebugMaps } from './debugger.js';

vi.mock('./debugger.js', async importOriginal => ({
	...(await importOriginal<typeof Debugger>()),
	nodeListToDebugMaps: vi.fn(() => []),
}));

describe('domLog', () => {
	// `log` is the module-wide `ml-parser` logger that every parser shares, so
	// both knobs touched here are restored after each test: the output sink
	// (replaced so the enabled case does not print into the test output), and
	// the `enabled` override — `debug` keeps any boolean as a permanent override
	// and only `null` hands evaluation back to the `DEBUG` namespaces.
	const sink = vi.fn();
	let originalSink: typeof log.log;

	beforeEach(() => {
		originalSink = log.log;
		log.log = sink;
	});

	afterEach(() => {
		log.log = originalSink;
		log.enabled = null as unknown as boolean;
		vi.clearAllMocks();
	});

	test('builds and emits the debug maps when the ml-parser logger is enabled', () => {
		const nodeList: never[] = [];
		log.enabled = true;

		domLog(nodeList);

		expect(nodeListToDebugMaps).toHaveBeenCalledTimes(1);
		expect(vi.mocked(nodeListToDebugMaps).mock.calls[0]?.[0]).toBe(nodeList);
		expect(sink).toHaveBeenCalledTimes(1);
	});

	test('neither builds nor emits the debug maps when the ml-parser logger is disabled', () => {
		log.enabled = false;

		domLog([]);

		expect(nodeListToDebugMaps).not.toHaveBeenCalled();
		expect(sink).not.toHaveBeenCalled();
	});
});
