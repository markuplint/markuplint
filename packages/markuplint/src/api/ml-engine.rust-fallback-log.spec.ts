import path from 'node:path';

import { afterEach, describe, expect, it, vi } from 'vitest';

import { MLEngine } from './ml-engine.js';

const nativeAddonIsBuilt = await import('@markuplint/core').then(
	mod => typeof mod.lintHtml === 'function',
	() => false,
);

const plugin001 = path.resolve(import.meta.dirname, '..', '..', 'test', 'plugin001.js');

/**
 * The fallback to the TypeScript engine is told on stderr, for the CLI, and as a `log` event, for a
 * consumer that has no stderr to read (the language server), whose phase is fixed.
 */
describe.skipIf(!nativeAddonIsBuilt)('experimentalRustCore tells the fallback to the TypeScript engine', () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	const logsOf = async (config: object, execs = 1) => {
		const stderr = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
		const file = await MLEngine.toMLFile({ sourceCode: '<p></p>', name: 'a.html' });
		const engine = new MLEngine(file!, {
			noSearchConfig: true,
			locale: 'en',
			experimentalRustCore: true,
			config,
		});
		const logs: [string, string][] = [];
		engine.on('log', (phase, message) => logs.push([phase, message]));
		for (let i = 0; i < execs; i++) {
			await engine.exec();
		}
		return { logs, stderr: stderr.mock.calls.map(([chunk]) => String(chunk)).join('') };
	};

	it('emits a log event of the phase "experimental-rust-core:fallback" for a plugin rule', async () => {
		const { logs, stderr } = await logsOf({ plugins: [plugin001], rules: { 'foo/bar': true } });

		const fallback = logs.filter(([phase]) => phase === 'experimental-rust-core:fallback');
		expect(fallback).toHaveLength(1);
		expect(fallback[0]?.[1]).toContain('has custom plugin rules');
		expect(fallback[0]?.[1]).toContain('falling back to TypeScript engine');
		expect(stderr).toContain('[experimental-rust-core]');
	});

	it('writes stderr once for an engine that lints again, and emits the log event every time', async () => {
		const { logs, stderr } = await logsOf({ plugins: [plugin001], rules: { 'foo/bar': true } }, 3);

		expect(stderr.split('[experimental-rust-core]')).toHaveLength(2);
		expect(logs.filter(([phase]) => phase === 'experimental-rust-core:fallback')).toHaveLength(3);
	});

	it('emits none while the Rust engine lints', async () => {
		const { logs, stderr } = await logsOf({ rules: { 'require-accessible-name': true } });

		expect(logs.filter(([phase]) => phase === 'experimental-rust-core:fallback')).toStrictEqual([]);
		expect(stderr).not.toContain('[experimental-rust-core]');
	});
});
