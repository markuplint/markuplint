import { describe, expect, it } from 'vitest';

import { MLEngine } from './ml-engine.js';

const nativeAddonIsBuilt = await import('@markuplint/core').then(
	mod => typeof mod.lintHtml === 'function',
	() => false,
);

/**
 * The Rust engine reads the syntax tree that a framework parser makes as JSON, and the depth of the JSON is the
 * depth of its native stack: `MAX_JSON_DEPTH` of `markuplint-core` (512 levels, about 256 elements) keeps a deep
 * document from aborting the process.
 */
describe.skipIf(!nativeAddonIsBuilt)('a document nested deeper than the Rust engine reads', () => {
	const run = async (depth: number) => {
		const sourceCode = `export const A = () => (${'<div>'.repeat(depth)}x${'</div>'.repeat(depth)});\n`;
		const file = await MLEngine.toMLFile({ sourceCode, name: 'a.jsx' });
		const engine = new MLEngine(file!, {
			noSearchConfig: true,
			locale: 'en',
			experimentalRustCore: true,
			config: {
				parser: { '\\.jsx$': '@markuplint/jsx-parser' },
				rules: { 'require-accessible-name': true },
			},
		});
		return engine.exec();
	};

	it('reads what the default limit of `serde_json` (64 elements) would refuse', async () => {
		const result = await run(100);

		expect(result?.violations.map(v => v.ruleId)).not.toContain('@markuplint/core');
	});

	it('reports what it refuses, where the process is not aborted', async () => {
		const result = await run(400);

		expect(result?.violations).toHaveLength(1);
		expect(result?.violations[0]).toMatchObject({
			ruleId: '@markuplint/core',
			severity: 'error',
			line: 0,
			col: 0,
		});
		expect(result?.violations[0]?.message).toContain('nested too deeply to be read');
	});
});
