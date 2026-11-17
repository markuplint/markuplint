import { mlRuleTest } from 'markuplint';
import { describe, test, expect } from 'vitest';

import rule from './index.js';

/**
 * Vue renders a `<template>` that has `v-if`, `v-else-if`, `v-else`, `v-for` or `v-slot` away, and leaves
 * the one that has any other directive (`v-show`, `:id`) a `template` element: it is what the area at the
 * top of a component has above it.
 */
const vue = {
	parser: { '.*': '@markuplint/vue-parser' },
	specs: { '.*': '@markuplint/vue-spec' },
};
const vueWithoutSpec = { parser: vue.parser };

describe.each([
	['with @markuplint/vue-spec', vue],
	['without @markuplint/vue-spec', vueWithoutSpec],
])('Vue %s', (_, config) => {
	test.each([
		['v-if', '<template v-if="a">'],
		['v-else', '<template v-else>'],
		['v-for', '<template v-for="b in c">'],
		['v-slot', '<template #item>'],
	])(
		'[require-ancestor-issue-4744-001] area in a template of %s at the top of a component is not reported',
		async (_, open) => {
			const { violations } = await mlRuleTest(
				rule,
				`<template>${open}<area alt="x" href="#" /></template></template>`,
				config,
			);
			expect(violations).toStrictEqual([]);
		},
	);

	test.each([
		['v-show', '<template v-show="a">', 32],
		['a bound attribute', '<template :id="a">', 29],
		['no directive', '<template>', 21],
	])(
		'[require-ancestor-issue-4744-002] area in a template with %s is below a template element',
		async (_, open, col) => {
			const { violations } = await mlRuleTest(
				rule,
				`<template>${open}<area alt="x" href="#" /></template></template>`,
				config,
			);
			expect(violations).toStrictEqual([
				{
					severity: 'error',
					line: 1,
					col,
					message: 'The "area" element must appear as a descendant of the "map" element',
					raw: '<area alt="x" href="#" />',
				},
			]);
		},
	);
});
