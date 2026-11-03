import { describe, expect, it, vi } from 'vitest';

import { MLEngine } from './ml-engine.js';

/**
 * `@markuplint/pretenders` is installed, but the scan of a component fails: the export raises an error that
 * is not a missing module. Vitest wraps an error thrown by a mock factory in its own, so the export throws it
 * instead.
 */
vi.mock('@markuplint/pretenders', () => ({
	get scan() {
		throw new Error('The scan of Item.vue failed');
	},
}));

describe('a configuration whose pretenders fail to resolve for a reason other than a missing package', () => {
	it('reports one error-severity config-error that carries the reason, and does not reject exec', async () => {
		const file = await MLEngine.toMLFile({ sourceCode: '<p>a</p>', name: 'a.html' });
		const engine = new MLEngine(file!, {
			noSearchConfig: true,
			config: { pretenders: { scan: [{ files: './nothing/*.vue' }] } },
		});

		const result = await engine.exec();

		expect(result?.violations).toStrictEqual([
			{
				ruleId: 'config-error',
				severity: 'error',
				message: 'The scan of Item.vue failed',
				line: 1,
				col: 1,
				raw: '',
			},
		]);
	});
});
