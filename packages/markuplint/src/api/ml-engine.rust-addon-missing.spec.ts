import { afterEach, describe, expect, it, vi } from 'vitest';

import { MLEngine } from './ml-engine.js';

vi.mock('@markuplint/core', () => {
	throw new Error('Cannot find the native addon');
});

/**
 * The fallback to the TypeScript engine is told on stderr, for the CLI, and as a `log` event, for a
 * consumer that has no stderr to read (the language server), whose phase is fixed. The one reason to
 * fall back is the native addon that cannot be loaded.
 */
describe('experimentalRustCore tells the fallback to the TypeScript engine', () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	const logsOf = async (execs = 1) => {
		const stderr = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
		const file = await MLEngine.toMLFile({ sourceCode: '<p></p>', name: 'a.html' });
		const engine = new MLEngine(file!, {
			noSearchConfig: true,
			locale: 'en',
			experimentalRustCore: true,
			config: { rules: { 'require-accessible-name': true } },
		});
		const logs: [string, string][] = [];
		engine.on('log', (phase, message) => logs.push([phase, message]));
		for (let i = 0; i < execs; i++) {
			await engine.exec();
		}
		return { logs, stderr: stderr.mock.calls.map(([chunk]) => String(chunk)).join('') };
	};

	it('emits a log event of the phase "experimental-rust-core:fallback" when the native addon is missing', async () => {
		const { logs, stderr } = await logsOf();

		const fallback = logs.filter(([phase]) => phase === 'experimental-rust-core:fallback');
		expect(fallback).toHaveLength(1);
		expect(fallback[0]?.[1]).toContain('NAPI binary not found');
		expect(fallback[0]?.[1]).toContain('falling back to TypeScript engine');
		expect(stderr).toContain('[experimental-rust-core]');
	});

	it('writes stderr once for an engine that lints again, and emits the log event every time', async () => {
		const { logs, stderr } = await logsOf(3);

		expect(stderr.split('[experimental-rust-core]')).toHaveLength(2);
		expect(logs.filter(([phase]) => phase === 'experimental-rust-core:fallback')).toHaveLength(3);
	});
});
