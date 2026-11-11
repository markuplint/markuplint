import { mlRuleTest } from 'markuplint';
import { describe, test, expect } from 'vitest';

import rule from './index.js';

/**
 * A component that no pretender resolved renders something that is not known: it may render the
 * required children, and it may stand for the children that an element has, so only what holds whatever
 * it renders is reported.
 */
describe('A component that no pretender resolved', () => {
	const jsx = {
		parser: {
			'.*': '@markuplint/jsx-parser',
		},
	};

	test('[permitted-contents-issue-4572-001] the only child of head may render the title', async () => {
		const { violations } = await mlRuleTest(rule, '<html lang="en"><head><Meta /></head><body></body></html>', jsx);
		expect(violations).toStrictEqual([]);
	});

	test('[permitted-contents-issue-4572-002] ignoreHasMutableChildren: false reports the missing title', async () => {
		const { violations } = await mlRuleTest(rule, '<html lang="en"><head><Meta /></head><body></body></html>', {
			...jsx,
			rule: { options: { ignoreHasMutableChildren: false } },
		});
		expect(violations).toStrictEqual([
			{
				severity: 'error',
				line: 1,
				col: 17,
				raw: '<head>',
				message: 'Require an element. (Need "title")',
			},
		]);
	});

	test('[permitted-contents-issue-4572-003] a dynamic attribute of a child does not render the title', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<html lang="en"><head><meta name={name} /></head><body></body></html>',
			jsx,
		);
		expect(violations).toStrictEqual([
			{
				severity: 'error',
				line: 1,
				col: 17,
				raw: '<head>',
				message: 'Require an element. (Need "title")',
			},
		]);
	});

	test('[permitted-contents-issue-4572-004] an expression in a descendant is not a child of the element', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<html lang="en"><head><noscript>{css}</noscript></head><body></body></html>',
			jsx,
		);
		expect(violations).toStrictEqual([
			{
				severity: 'error',
				line: 1,
				col: 17,
				raw: '<head>',
				message: 'Require an element. (Need "title")',
			},
		]);
	});

	test('[permitted-contents-issue-4572-005] a component in a descendant is not a child of the element', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<html lang="en"><head><noscript><Css /></noscript></head><body></body></html>',
			jsx,
		);
		expect(violations).toStrictEqual([
			{
				severity: 'error',
				line: 1,
				col: 17,
				raw: '<head>',
				message: 'Require an element. (Need "title")',
			},
		]);
	});

	test('[permitted-contents-issue-4572-006] a component that a pretender resolved is the element that it renders', async () => {
		const { violations } = await mlRuleTest(rule, '<html lang="en"><head><Meta /></head><body></body></html>', {
			...jsx,
			pretenders: [{ selector: 'Meta', as: 'meta' }],
		});
		expect(violations).toStrictEqual([
			{
				severity: 'error',
				line: 1,
				col: 17,
				raw: '<head>',
				message: 'Require an element. (Need "title")',
			},
		]);
	});

	test('[permitted-contents-issue-4572-007] a pretender whose target is a component renders something that is not known', async () => {
		const { violations } = await mlRuleTest(rule, '<html lang="en"><head><Meta /></head><body></body></html>', {
			...jsx,
			pretenders: [{ selector: 'Meta', as: 'Foo.Bar' }],
		});
		expect(violations).toStrictEqual([]);
	});

	test('[permitted-contents-issue-4572-008] a component is not reported as an element that the content model does not take', async () => {
		expect((await mlRuleTest(rule, '<ul><Item /></ul>', jsx)).violations).toStrictEqual([]);
		expect((await mlRuleTest(rule, '<svg><Icon /></svg>', jsx)).violations).toStrictEqual([]);
	});

	test('[permitted-contents-issue-4572-009] an element that no entry of the content model takes is reported beside a component', async () => {
		const { violations } = await mlRuleTest(rule, '<ul><Item /><div></div></ul>', jsx);
		expect(violations).toStrictEqual([
			{
				severity: 'error',
				line: 1,
				col: 13,
				raw: '<div>',
				message: 'The "div" element is not allowed in the "ul" element in this context',
			},
		]);
	});

	test('[permitted-contents-issue-4572-010] more elements than the content model takes are reported beside a component', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<math><mfrac><Num /><mi>a</mi><mi>b</mi><mi>c</mi></mfrac></math>',
			jsx,
		);
		expect(violations).toStrictEqual([
			{
				severity: 'error',
				line: 1,
				col: 41,
				raw: '<mi>',
				message: 'There is more content than it needs. The max number of elements required is two',
			},
		]);
	});

	test('[permitted-contents-issue-4572-011] a second title is reported beside a component: no component renders it away', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<html lang="en"><head><Meta /><title>a</title><title>b</title></head><body></body></html>',
			jsx,
		);
		expect(violations).toStrictEqual([
			{
				severity: 'error',
				line: 1,
				col: 47,
				raw: '<title>',
				message: 'The "title" element is not allowed in the "head" element in this context',
			},
		]);
	});

	test('[permitted-contents-issue-4572-012] the order is not reported beside a component: it may render the element that goes before', async () => {
		const { violations } = await mlRuleTest(rule, '<dl><Term /><dd>description</dd></dl>', jsx);
		expect(violations).toStrictEqual([]);
	});

	test('[permitted-contents-issue-4572-013] a component is checked by its name when a tag rule is written for the element', async () => {
		const { violations } = await mlRuleTest(rule, '<Tabs><Item /></Tabs>', {
			...jsx,
			rule: [{ tag: 'Tabs', contents: [{ require: 'Tab' }] }],
		});
		expect(violations).toStrictEqual([
			{
				severity: 'error',
				line: 1,
				col: 1,
				raw: '<Tabs>',
				message: 'Require an element. (Need "Tab")',
			},
		]);
	});

	test('[permitted-contents-issue-4572-014] a component may render the one or more elements that are missing', async () => {
		expect((await mlRuleTest(rule, '<table><Foo /></table>', jsx)).violations).toStrictEqual([]);
	});

	test('[permitted-contents-issue-4572-015] ignoreHasMutableChildren: false evaluates a component by its name', async () => {
		const { violations } = await mlRuleTest(rule, '<table><Foo /></table>', {
			...jsx,
			rule: { options: { ignoreHasMutableChildren: false } },
		});
		expect(violations).toStrictEqual([
			{
				severity: 'error',
				line: 1,
				col: 8,
				raw: '<Foo />',
				message: 'The "Foo" element is not allowed in the "table" element in this context',
			},
		]);
	});

	test('[permitted-contents-issue-4572-016] ignoreHasMutableChildren: false reports what a component may render', async () => {
		const { violations } = await mlRuleTest(rule, '<dl><Term /><dd>description</dd></dl>', {
			...jsx,
			rule: { options: { ignoreHasMutableChildren: false } },
		});
		expect(violations).toStrictEqual([
			{
				severity: 'error',
				line: 1,
				col: 1,
				raw: '<dl>',
				message: 'Require one or more elements. (Need "dt")',
			},
		]);
	});

	test('[permitted-contents-issue-4572-017] a component that the tag rule names is valid', async () => {
		const { violations } = await mlRuleTest(rule, '<Tabs><Tab /></Tabs>', {
			...jsx,
			rule: [{ tag: 'Tabs', contents: [{ require: 'Tab' }] }],
		});
		expect(violations).toStrictEqual([]);
	});

	test('[permitted-contents-issue-4572-018] a slot may render the required element', async () => {
		const { violations } = await mlRuleTest(rule, '<html lang="en"><head><slot /></head><body></body></html>', jsx);
		expect(violations).toStrictEqual([]);
	});

	test('[permitted-contents-issue-4572-019] every conditional branch is evaluated without the component', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<template><ul><Item v-if="a" /><div v-else></div></ul></template>',
			{
				parser: { '.*': '@markuplint/vue-parser' },
				rule: { options: { evaluateConditionalChildNodes: true } },
			},
		);
		expect(violations).toStrictEqual([
			{
				severity: 'error',
				line: 1,
				col: 32,
				raw: '<div v-else>',
				message: 'The "div" element is not allowed in the "ul" element in this context',
			},
		]);
	});

	test('[permitted-contents-issue-4572-022] a branch without the component is still checked for the missing child', async () => {
		const { violations } = await mlRuleTest(rule, '<details>{#if a}<Foo />{:else}<p>text</p>{/if}</details>', {
			parser: { '.*': '@markuplint/svelte-parser' },
			rule: { options: { evaluateConditionalChildNodes: true } },
		});
		expect(violations).toStrictEqual([
			{
				severity: 'error',
				line: 1,
				col: 1,
				raw: '<details>',
				message: 'Require an element. (Need "summary")',
			},
		]);
	});

	test('[permitted-contents-issue-4572-020] a component in a fragment pretender is a child of the element', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<html lang="en"><head><Fragment><Meta /></Fragment></head><body></body></html>',
			{
				...jsx,
				pretenders: [{ selector: 'Fragment', as: { element: '#fragment' } }],
			},
		);
		expect(violations).toStrictEqual([]);
	});

	test('[permitted-contents-issue-4572-021] an element that has no content is reported beside a component', async () => {
		const { violations } = await mlRuleTest(rule, '<br><Foo /></br>', jsx);
		expect(violations).toStrictEqual([
			{
				severity: 'error',
				line: 1,
				col: 1,
				raw: '<br>',
				message: 'The element disallows contents',
			},
		]);
	});
});
