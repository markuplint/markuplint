import { Ruleset } from '@markuplint/ml-core';
import { afterEach, test, expect, vi } from 'vitest';

import { autoLoadRules, cacheClear } from './auto-load-rules.js';

afterEach(() => {
	cacheClear();
});

vi.mock('markuplint-rule-fake', () => {
	return {
		default: {},
	};
});

test('third-party-rules', async () => {
	const r = await autoLoadRules(
		new Ruleset({
			rules: {
				fake: true,
			},
		}),
	);

	expect(r.rules).toEqual([]);
	expect(r.errors.length).toBe(1);
});

test('invalid-rules', async () => {
	const r = await autoLoadRules(
		new Ruleset({
			rules: {
				invalid: true,
			},
		}),
	);

	expect(r.rules).toEqual([]);
	expect(r.errors.length).toBe(2);
});

test('missing rules are not re-imported until cacheClear', async () => {
	const ruleset = new Ruleset({
		rules: {
			'not-installed': true,
		},
	});

	await autoLoadRules(ruleset);
	expect((await autoLoadRules(ruleset)).errors.length).toBe(0);

	cacheClear();
	expect((await autoLoadRules(ruleset)).errors.length).toBe(2);
});
