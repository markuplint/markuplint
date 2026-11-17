import { mlRuleTest } from 'markuplint';
import { describe, test, expect } from 'vitest';

import rule from './index.js';

/**
 * What the framework renders away is not an element of the output, so what is written in it is owned by
 * what is above it: Vue renders a `<template>` that has `v-if`, `v-else-if`, `v-else`, `v-for` or `v-slot` away.
 * It holds without `@markuplint/vue-spec`, as the parser says it.
 */
const vueWithoutSpec = {
	parser: { '.*': '@markuplint/vue-parser' },
	pretenders: [{ selector: 'List', as: 'ul' }],
};
const vue = { ...vueWithoutSpec, specs: { '.*': '@markuplint/vue-spec' } };

describe.each([
	['with @markuplint/vue-spec', vue],
	['without @markuplint/vue-spec', vueWithoutSpec],
])('Vue %s', (_, config) => {
	test.each([
		['v-if', '<ul><template v-if="x"><li>a</li></template></ul>'],
		['v-else', '<ul><template v-if="x"><li>a</li></template><template v-else><li>b</li></template></ul>'],
		['v-for', '<ul><template v-for="i in xs" :key="i"><li>a</li></template></ul>'],
		['a default slot', '<List><template #default><li>a</li></template></List>'],
		['a named slot', '<List><template #item><li>a</li></template></List>'],
	])('[require-owned-elements-issue-4744-001] %s is not reported', async (_, code) => {
		const { violations } = await mlRuleTest(rule, `<template>${code}</template>`, config);
		expect(violations).toStrictEqual([]);
	});

	test.each([
		['a template of v-if', '<ul><template v-if="x"><p>a</p></template></ul>'],
		['a named slot', '<List><template #item><p>a</p></template></List>'],
		['a dynamic slot', '<List><template #[name]><p>a</p></template></List>'],
	])(
		'[require-owned-elements-issue-4744-006] %s may be rendered anywhere, or not at all, so what is in it is not judged',
		async (_, code) => {
			const { violations } = await mlRuleTest(rule, `<template>${code}</template>`, config);
			expect(violations).toStrictEqual([]);
		},
	);

	test('[require-owned-elements-issue-4744-002] an element that is not rendered away does not own what is in it', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<template><ul><template><li>a</li></template></ul></template>',
			config,
		);
		expect(violations.map(v => v.raw)).toStrictEqual(['<ul>']);
	});
});

describe('Vue without @markuplint/vue-spec', () => {
	test('[require-owned-elements-issue-4744-003] a template with v-show stays an element, so it owns nothing', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<template><ul><template v-show="x"><li>a</li></template></ul></template>',
			vueWithoutSpec,
		);
		expect(violations.map(v => v.raw)).toStrictEqual(['<ul>']);
	});
});

describe('Svelte', () => {
	test('[require-owned-elements-issue-4744-008] a block is not reported, as before', async () => {
		const { violations } = await mlRuleTest(rule, '<ul>{#if a}<li>1</li>{/if}</ul>', {
			parser: { '.*': '@markuplint/svelte-parser' },
		});
		expect(violations).toStrictEqual([]);
	});
});

describe('Fragments', () => {
	test('[require-owned-elements-issue-4744-004] a fragment of JSX is not what the element owns', async () => {
		const { violations } = await mlRuleTest(rule, 'const a = <ul><><li>a</li></></ul>;', {
			parser: { '.*': '@markuplint/jsx-parser' },
		});
		expect(violations).toStrictEqual([]);
	});

	test('[require-owned-elements-issue-4744-005] a fragment of JSX is not an owned element itself', async () => {
		const { violations } = await mlRuleTest(rule, 'const a = <ul><><p>a</p></></ul>;', {
			parser: { '.*': '@markuplint/jsx-parser' },
		});
		expect(violations.map(v => v.raw)).toStrictEqual(['<ul>']);
	});
});
