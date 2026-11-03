import type { Config } from '@markuplint/ml-config';

import { describe, expect, it, vi } from 'vitest';

import { MLEngine } from './ml-engine.js';

/**
 * `@markuplint/pretenders` is made to be missing, as Node reports a package that is not installed: the code
 * `ERR_MODULE_NOT_FOUND`, and a message that names the package. Vitest wraps an error thrown by a mock
 * factory in its own, which has no `code`, so every export throws it instead.
 */
vi.mock('@markuplint/pretenders', () => {
	const notFound = () =>
		Object.assign(
			new Error(
				"Cannot find package '@markuplint/pretenders' imported from /project/node_modules/@markuplint/file-resolver/lib/resolve-pretenders.js",
			),
			{ code: 'ERR_MODULE_NOT_FOUND' },
		);
	return {
		get scan() {
			throw notFound();
		},
		get autoScan() {
			throw notFound();
		},
		get disambiguatePretenders() {
			throw notFound();
		},
		get clearPretenderCaches() {
			throw notFound();
		},
	};
});

const NEEDS_PRETENDERS: readonly (readonly [string, NonNullable<Config['pretenders']>])[] = [
	['pretenders.scan', { scan: [{ files: './nothing/*.vue' }] }],
	['pretenders.auto', { auto: true }],
	[
		'a pretender that has a filePath',
		{ data: [{ selector: 'MyButton', as: 'button', filePath: '/p/MyButton.vue:1:1' }] },
	],
];

describe('a configuration that needs @markuplint/pretenders when it is not installed', () => {
	it.each(NEEDS_PRETENDERS)(
		'reports one error-severity config-error that says how to install it: %s',
		async (_, pretenders) => {
			const file = await MLEngine.toMLFile({ sourceCode: '<p>a</p>', name: 'a.html' });
			const engine = new MLEngine(file!, { noSearchConfig: true, config: { pretenders } });

			const result = await engine.exec();

			expect(result?.status).toBe('processed');
			expect(result?.violations).toStrictEqual([
				{
					ruleId: 'config-error',
					severity: 'error',
					message: expect.stringContaining('npm install --save-dev @markuplint/pretenders'),
					line: 1,
					col: 1,
					raw: '',
				},
			]);
		},
	);

	it('emits lint-error with the cause', async () => {
		const file = await MLEngine.toMLFile({ sourceCode: '<p>a</p>', name: 'a.html' });
		const engine = new MLEngine(file!, { noSearchConfig: true, config: { pretenders: { auto: true } } });
		const errors: Error[] = [];
		engine.on('lint-error', (_filePath, _sourceCode, error) => {
			errors.push(error);
		});

		await engine.exec();

		expect(errors).toHaveLength(1);
		expect(errors[0]).toMatchObject({
			message: expect.stringContaining('"pretenders.auto"'),
			cause: { code: 'ERR_MODULE_NOT_FOUND' },
		});
	});

	it('reports the same on the next exec of the engine, which resolves again', async () => {
		const file = await MLEngine.toMLFile({ sourceCode: '<p>a</p>', name: 'a.html' });
		const engine = new MLEngine(file!, { noSearchConfig: true, config: { pretenders: { auto: true } } });

		const first = await engine.exec();
		const second = await engine.exec();

		expect(second?.violations).toStrictEqual(first?.violations);
		expect(second?.violations.map(v => v.ruleId)).toStrictEqual(['config-error']);
	});

	it('lints a configuration that does not need it', async () => {
		const file = await MLEngine.toMLFile({ sourceCode: '<p>a</p>', name: 'a.html' });
		const engine = new MLEngine(file!, {
			noSearchConfig: true,
			config: { pretenders: { data: [{ selector: 'MyButton', as: 'button' }] } },
		});

		const result = await engine.exec();

		expect(result?.violations).toStrictEqual([]);
	});

	it('leaves setCode with nothing to apply, and the next exec reports the config-error', async () => {
		const file = await MLEngine.toMLFile({ sourceCode: '<p>a</p>', name: 'a.html' });
		const engine = new MLEngine(file!, { noSearchConfig: true, config: { pretenders: { auto: true } } });

		await expect(engine.setCode('<p>b</p>')).resolves.toBeUndefined();

		const result = await engine.exec();
		expect(result?.violations.map(v => v.ruleId)).toStrictEqual(['config-error']);
	});
});
