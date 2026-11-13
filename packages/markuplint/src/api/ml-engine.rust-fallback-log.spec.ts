import { afterEach, describe, expect, it, vi } from 'vitest';

import { MLEngine } from './ml-engine.js';

const nativeAddonIsBuilt = await import('@markuplint/core').then(
	mod => typeof mod.lintHtml === 'function',
	() => false,
);

/**
 * The fallback to the TypeScript engine is told on stderr and as a `log` event (see
 * `ml-engine.rust-addon-missing.spec.ts`); there is none while the Rust engine lints.
 */
describe.skipIf(!nativeAddonIsBuilt)('experimentalRustCore tells no fallback while the Rust engine lints', () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	const logsOf = async (config: object) => {
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
		await engine.exec();
		return { logs, stderr: stderr.mock.calls.map(([chunk]) => String(chunk)).join('') };
	};

	it('emits none while the Rust engine lints', async () => {
		const { logs, stderr } = await logsOf({ rules: { 'require-accessible-name': true } });

		expect(logs.filter(([phase]) => phase === 'experimental-rust-core:fallback')).toStrictEqual([]);
		expect(stderr).not.toContain('[experimental-rust-core]');
	});
});
