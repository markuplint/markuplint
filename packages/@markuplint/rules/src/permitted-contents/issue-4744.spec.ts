import { mlRuleTest } from 'markuplint';
import { describe, test, expect } from 'vitest';

import rule from './index.js';

/**
 * What the framework renders away is not an element of the output, so what is written in it is a child of
 * what is above it: Vue renders a `<template>` that has `v-for` away and puts its body in place, the way
 * the body of an `each` block is. A `<template v-if>` is one of the branches of a condition, as a block is:
 * what a branch holds is not read unless the conditional child nodes are evaluated. The elements of a chain
 * of `v-if`, `v-else-if` and `v-else` are a choice of one, whichever way they are read.
 */
const vue = {
	parser: { '.*': '@markuplint/vue-parser' },
	specs: { '.*': '@markuplint/vue-spec' },
	pretenders: [{ selector: 'List', as: 'ul' }],
};
const vueWithoutSpec = { parser: vue.parser, pretenders: vue.pretenders };
const conditional = { rule: { options: { evaluateConditionalChildNodes: true } } };

const DIV_IN_UL = 'The "div" element is not allowed in the "ul" element in this context';
const CAPTION_IN_TABLE = 'The "caption" element is not allowed in the "table" element in this context';

describe.each([
	['with @markuplint/vue-spec', vue],
	['without @markuplint/vue-spec', vueWithoutSpec],
])('Vue %s', (_, config) => {
	test('[permitted-contents-issue-4744-001] the body of v-for is a child of the element above', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<template><ul><template v-for="i in xs"><div>a</div></template></ul></template>',
			config,
		);
		expect(violations).toStrictEqual([{ severity: 'error', line: 1, col: 41, message: DIV_IN_UL, raw: '<div>' }]);
	});

	test('[permitted-contents-issue-4744-002] a body of v-for that the element above takes is not reported', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<template><dl><template v-for="i in xs" :key="i"><dt>t</dt><dd>d</dd></template></dl></template>',
			config,
		);
		expect(violations).toStrictEqual([]);
	});

	test('[permitted-contents-issue-4744-003] what is in a template of v-if is not read by default, as what is in a block is not (a known limit of the default)', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<template><ul><template v-if="a"><div>x</div></template></ul></template>',
			config,
		);
		expect(violations).toStrictEqual([]);
	});

	test('[permitted-contents-issue-4744-004] evaluateConditionalChildNodes reads what is in a template of v-if', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<template><ul><template v-if="a"><div>x</div></template></ul></template>',
			{ ...config, ...conditional },
		);
		expect(violations).toStrictEqual([{ severity: 'error', line: 1, col: 34, message: DIV_IN_UL, raw: '<div>' }]);
	});

	test('[permitted-contents-issue-4744-005] the nodes of a template of v-if are rendered together', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<template><dl><template v-if="a"><dt>t</dt><dd>d</dd></template></dl></template>',
			{ ...config, ...conditional },
		);
		expect(violations).toStrictEqual([]);
	});

	test('[permitted-contents-issue-4744-006] a chain of templates is a choice of one', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<template><table><template v-if="a"><caption>A</caption></template><template v-else><caption>B</caption></template><tr><td>1</td></tr></table></template>',
			{ ...config, ...conditional },
		);
		expect(violations).toStrictEqual([]);
	});

	test.each([
		['by default', {}],
		['with evaluateConditionalChildNodes', conditional],
	])('[permitted-contents-issue-4744-007] a chain of elements is a choice of one %s', async (_, options) => {
		const { violations } = await mlRuleTest(
			rule,
			'<template><table><caption v-if="a">A</caption><caption v-else>B</caption><tr><td>1</td></tr></table></template>',
			{ ...config, ...options },
		);
		expect(violations).toStrictEqual([]);
	});

	test('[permitted-contents-issue-4744-008] a chain of elements with v-else-if and a space between them is a choice of one', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<template><table>\n<caption v-if="a">A</caption>\n<caption v-else-if="b">B</caption>\n<caption v-else>C</caption>\n<tr><td>1</td></tr></table></template>',
			config,
		);
		expect(violations).toStrictEqual([]);
	});

	test('[permitted-contents-issue-4744-009] elements of v-if that are not in one chain are all rendered', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<template><table><caption v-if="a">A</caption><caption v-if="b">B</caption><tr><td>1</td></tr></table></template>',
			config,
		);
		expect(violations).toStrictEqual([
			{ severity: 'error', line: 1, col: 47, message: CAPTION_IN_TABLE, raw: '<caption v-if="b">' },
		]);
	});

	test('[permitted-contents-issue-4744-010] an element of v-if that the element above does not take is reported', async () => {
		const { violations } = await mlRuleTest(rule, '<template><ul><div v-if="a">x</div></ul></template>', config);
		expect(violations).toStrictEqual([
			{ severity: 'error', line: 1, col: 15, message: DIV_IN_UL, raw: '<div v-if="a">' },
		]);
	});

	test('[permitted-contents-issue-4744-011] an element of v-for that the element above does not take is reported', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<template><ul><div v-for="i in xs">x</div></ul></template>',
			config,
		);
		expect(violations).toStrictEqual([
			{ severity: 'error', line: 1, col: 15, message: DIV_IN_UL, raw: '<div v-for="i in xs">' },
		]);
	});

	test.each([
		['by default', {}],
		['with evaluateConditionalChildNodes', conditional],
	])(
		'[permitted-contents-issue-4744-020] a comment between the elements of a chain does not end it %s',
		async (_, options) => {
			const { violations } = await mlRuleTest(
				rule,
				'<template><table><caption v-if="a">A</caption><!-- c --><caption v-else>B</caption><tr><td>1</td></tr></table></template>',
				{ ...config, ...options },
			);
			expect(violations).toStrictEqual([]);
		},
	);

	test('[permitted-contents-issue-4744-021] a v-for template in a v-for template is flattened as well', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<template><ul><template v-for="i in xs"><template v-for="j in ys"><div>a</div></template></template></ul></template>',
			config,
		);
		expect(violations).toStrictEqual([{ severity: 'error', line: 1, col: 67, message: DIV_IN_UL, raw: '<div>' }]);
	});

	test('[permitted-contents-issue-4744-022] a v-for template in a template of v-if is flattened into the branch', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<template><ul><template v-if="x"><template v-for="i in xs"><div>a</div></template></template></ul></template>',
			{ ...config, ...conditional },
		);
		expect(violations).toStrictEqual([{ severity: 'error', line: 1, col: 60, message: DIV_IN_UL, raw: '<div>' }]);
	});

	test('[permitted-contents-issue-4744-023] many pairs of v-if and v-else are read at once without a limit on the checking time', async () => {
		const pairs = Array.from({ length: 40 }, (_, i) => `<li v-if="a${i}">a</li><li v-else>b</li>`).join('');
		const { violations } = await mlRuleTest(rule, `<template><ul>${pairs}</ul></template>`, {
			...config,
			...conditional,
		});
		expect(violations).toStrictEqual([]);
	});
});

describe('A component that a pretender resolved', () => {
	test('[permitted-contents-issue-4744-012] what is passed to the default slot is a child of the component', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<template><List><template #default><div>a</div></template></List></template>',
			vue,
		);
		expect(violations).toStrictEqual([{ severity: 'error', line: 1, col: 36, message: DIV_IN_UL, raw: '<div>' }]);
	});

	test('[permitted-contents-issue-4744-013] what the default slot is passed and the component takes is not reported', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<template><List><template #default><li>a</li></template></List></template>',
			vue,
		);
		expect(violations).toStrictEqual([]);
	});

	test('[permitted-contents-issue-4744-014] v-slot without a name is the default slot', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<template><List><template v-slot><div>a</div></template></List></template>',
			vue,
		);
		expect(violations).toStrictEqual([{ severity: 'error', line: 1, col: 34, message: DIV_IN_UL, raw: '<div>' }]);
	});

	test.each([
		['a named slot', '<template #item><div>a</div></template>'],
		['a dynamic slot', '<template #[name]><div>a</div></template>'],
	])(
		'[permitted-contents-issue-4744-015] %s is placed where the component says, which is not known',
		async (_, slot) => {
			const { violations } = await mlRuleTest(rule, `<template><List>${slot}</List></template>`, vue);
			expect(violations).toStrictEqual([]);
		},
	);

	test('[permitted-contents-issue-4744-016] the default slot of a component that no pretender resolved is not read', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<template><Foo><template #default><div>a</div></template></Foo></template>',
			{ parser: vue.parser, specs: vue.specs },
		);
		expect(violations).toStrictEqual([]);
	});

	test('[permitted-contents-issue-4744-017] a default slot with v-if is a conditional branch, so it is not read by default', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<template><List><template #default v-if="x"><div>a</div></template></List></template>',
			vue,
		);
		expect(violations).toStrictEqual([]);
	});
});

describe('Svelte', () => {
	const svelte = { parser: { '.*': '@markuplint/svelte-parser' } };

	test('[permitted-contents-issue-4744-018] blocks that are written side by side are independent', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<table>{#if a}<caption>A</caption>{/if}{#if b}<caption>B</caption>{/if}<tr><td>1</td></tr></table>',
			{ ...svelte, ...conditional },
		);
		expect(violations).toStrictEqual([
			{ severity: 'error', line: 1, col: 47, message: CAPTION_IN_TABLE, raw: '<caption>' },
		]);
	});

	test('[permitted-contents-issue-4744-019] the nodes of a branch are rendered together', async () => {
		const { violations } = await mlRuleTest(rule, '<dl>{#if a}<dt>t</dt><dd>d</dd>{/if}</dl>', {
			...svelte,
			...conditional,
		});
		expect(violations).toStrictEqual([]);
	});

	test('[permitted-contents-issue-4744-024] the branches of a chain that ends with else are a choice of one', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<table>{#if a}<caption>A</caption>{:else}<caption>B</caption>{/if}<tr><td>1</td></tr></table>',
			{ ...svelte, ...conditional },
		);
		expect(violations).toStrictEqual([]);
	});

	test('[permitted-contents-issue-4744-025] a chain that ends with else renders one of its branches', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<head>{#if a}<title>A</title>{:else}<title>B</title>{/if}</head>',
			{ ...svelte, ...conditional },
		);
		expect(violations).toStrictEqual([]);
	});
});
