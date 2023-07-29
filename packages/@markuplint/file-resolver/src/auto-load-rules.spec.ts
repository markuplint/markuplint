import { Ruleset } from '@markuplint/ml-core';
import { test, expect, vi } from 'vitest';

import { autoLoadRules } from './auto-load-rules.js';

vi.mock('markuplint-rule-fake', () => {
	return {
		default: {},
	};
});

test('built-in-rules', async () => {
	const r = await autoLoadRules(
		new Ruleset({
			rules: {
				textlint: true,
			},
		}),
	);

	expect(r.rules).toEqual([
		{
			name: 'textlint',
			defaultSeverity: 'warning',
			defaultValue: true,
			defaultOptions: true,
		},
	]);
	expect(r.errors).toEqual([]);
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
