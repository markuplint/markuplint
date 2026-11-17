import { mlRuleTest } from 'markuplint';
import { describe, test, expect } from 'vitest';

import rule from './index.js';

/**
 * Whether a loop renders anything is known only at run time, so the body of a loop is owned as it is written:
 * a list whose items are all in a loop is not reported, though it owns none when the loop has no items.
 */
const vue = { parser: { '.*': '@markuplint/vue-parser' } };
const vueWithSpec = { ...vue, specs: { '.*': '@markuplint/vue-spec' } };

describe('The body of a loop', () => {
	test('[require-owned-elements-issue-4748-001] {#each} of Svelte is owned as it is written', async () => {
		const { violations } = await mlRuleTest(rule, '<ul>{#each xs as i}<li>a</li>{/each}</ul>', {
			parser: { '.*': '@markuplint/svelte-parser' },
		});
		expect(violations).toStrictEqual([]);
	});

	test.each([
		['without @markuplint/vue-spec', vue],
		['with @markuplint/vue-spec', vueWithSpec],
	])(
		'[require-owned-elements-issue-4748-002] <template v-for> of Vue is owned as it is written %s',
		async (_, config) => {
			const { violations } = await mlRuleTest(
				rule,
				'<template><ul><template v-for="i in xs"><li>a</li></template></ul></template>',
				config,
			);
			expect(violations).toStrictEqual([]);
		},
	);

	test.each([
		['without @markuplint/vue-spec', vue],
		['with @markuplint/vue-spec', vueWithSpec],
	])(
		'[require-owned-elements-issue-4748-003] an element with v-for of Vue is owned as it is written %s',
		async (_, config) => {
			const { violations } = await mlRuleTest(
				rule,
				'<template><ul><li v-for="i in xs">a</li></ul></template>',
				config,
			);
			expect(violations).toStrictEqual([]);
		},
	);
});
