import { describe, expect, test } from 'vitest';

import { getLoadedComponentNameRule, loadComponentNameRule } from './scanner-loader.js';

describe('loadComponentNameRule', () => {
	test('files analysed at the same time load the rule of the parser once, and all get it', async () => {
		expect(getLoadedComponentNameRule('.tsx')).toBeUndefined();

		await Promise.all([
			loadComponentNameRule('.tsx'),
			loadComponentNameRule('.tsx'),
			loadComponentNameRule('.tsx'),
		]);

		const rule = getLoadedComponentNameRule('.tsx');
		expect(rule?.('_Layout')).toBe(true);
		expect(rule?.('div')).toBe(false);
	});

	test('the rule of an extension is the one of the parser of its language', async () => {
		await Promise.all([
			loadComponentNameRule('.astro'),
			loadComponentNameRule('.svelte'),
			loadComponentNameRule('.vue'),
		]);

		expect(getLoadedComponentNameRule('.astro')?.('_Layout')).toBe(false);
		expect(getLoadedComponentNameRule('.astro')?.('ui.Item')).toBe(false);
		expect(getLoadedComponentNameRule('.svelte')?.('ui.Item')).toBe(true);
		expect(getLoadedComponentNameRule('.vue')?.('fooBar')).toBe(true);
	});

	test('an extension that no parser reads has no rule', async () => {
		await loadComponentNameRule('.unknown');

		expect(getLoadedComponentNameRule('.unknown')).toBeUndefined();
	});
});
