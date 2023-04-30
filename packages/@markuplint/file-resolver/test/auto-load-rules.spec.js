const { Ruleset } = require('@markuplint/ml-core');

const { autoLoadRules } = require('../lib/auto-load-rules');

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
