import { Ruleset } from '@markuplint/ml-core';
import textlintRule from '@markuplint/rule-textlint';

import { autoLoadRules } from './auto-load-rules';

test('built-in-rules', async () => {
	const r = await autoLoadRules(
		new Ruleset({
			rules: {
				textlint: true,
			},
		}),
	);

	expect(r.rules).toEqual([textlintRule]);
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

	expect(r.rules).toEqual([{}]);
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
