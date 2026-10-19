import { mlRuleTest } from 'markuplint';
import { describe, test, expect } from 'vitest';

import rule from './index.js';

// Vue resolves `<FooBar>`, `<fooBar>` and `<foo-bar>` to the same component, and `<foobar>` to none of them.
describe('a tag rule of a component in a Vue template', () => {
	const vue = { parser: { '.*': '@markuplint/vue-parser' } };

	const tagRule = { tag: 'FooBar', contents: [{ require: 'x-item' }] };

	test.each(['FooBar', 'fooBar', 'foo-bar'])(
		'[permitted-contents-issue-4314-001] the rule of FooBar applies to <%s>',
		async tag => {
			const { violations } = await mlRuleTest(rule, `<template><div><${tag}></${tag}></div></template>`, {
				...vue,
				rule: [tagRule],
			});
			expect(violations).toStrictEqual([
				{
					severity: 'error',
					line: 1,
					col: 16,
					raw: `<${tag}>`,
					message: 'Require an element. (Need "x-item")',
				},
			]);
		},
	);

	test.each(['FooBar', 'fooBar', 'foo-bar'])(
		'[permitted-contents-issue-4314-002] <%s> that has what the rule requires is valid',
		async tag => {
			const { violations } = await mlRuleTest(
				rule,
				`<template><div><${tag}><x-item /></${tag}></div></template>`,
				{ ...vue, rule: [tagRule] },
			);
			expect(violations).toStrictEqual([]);
		},
	);

	test('[permitted-contents-issue-4314-003] the rule of FooBar does not apply to <foobar>, which is an unknown element', async () => {
		const { violations } = await mlRuleTest(rule, '<template><div><foobar></foobar></div></template>', {
			...vue,
			rule: [tagRule],
		});
		expect(violations).toStrictEqual([
			{
				severity: 'error',
				line: 1,
				col: 16,
				raw: '<foobar>',
				message: 'The "foobar" element is not allowed in the "div" element in this context',
			},
		]);
	});

	test('[permitted-contents-issue-4314-004] the rule of FooBar is checked for the component a pretender is made of', async () => {
		const { violations } = await mlRuleTest(rule, '<template><div><foo-bar></foo-bar></div></template>', {
			...vue,
			pretenders: [{ selector: 'FooBar', as: 'section' }],
			rule: [tagRule],
		});
		expect(violations).toStrictEqual([
			{
				severity: 'error',
				line: 1,
				col: 16,
				raw: '<foo-bar>',
				message: 'Require an element. (Need "x-item")',
			},
		]);
	});

	test('[permitted-contents-issue-4314-005] a required child is matched by the name of the component, whichever way it is written', async () => {
		const { violations } = await mlRuleTest(rule, '<template><div><Tabs><tab-item /></Tabs></div></template>', {
			...vue,
			rule: [{ tag: 'Tabs', contents: [{ require: 'TabItem' }] }],
		});
		expect(violations).toStrictEqual([]);
	});
});
