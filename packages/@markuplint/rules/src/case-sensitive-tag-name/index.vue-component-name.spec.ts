import { mlRuleTest } from 'markuplint';
import { describe, test, expect } from 'vitest';

import rule from './index.js';

// A tag that is not a native one is a component to Vue, so `<fooBar>` is the component `FooBar` and not an HTML
// element written in a mixed case: lowercasing it (the fix of this rule) would make it another tag.
describe('a camelCase tag in a Vue template', () => {
	const vue = { parser: { '.*': '@markuplint/vue-parser' } };

	test.each(['fooBar', 'FooBar', 'foo-bar', 'ui.Item'])(
		'[case-sensitive-tag-name-issue-4314-001] <%s> is a component and is not reported',
		async tag => {
			const { violations } = await mlRuleTest(rule, `<template><div><${tag} /></div></template>`, vue);
			expect(violations).toStrictEqual([]);
		},
	);

	test('[case-sensitive-tag-name-issue-4314-002] a tag with a capital initial is a component, so DIV is not reported either', async () => {
		const { violations } = await mlRuleTest(rule, '<template><DIV></DIV></template>', {
			...vue,
			rule: { severity: 'warning', value: 'lower' },
		});
		expect(violations).toStrictEqual([]);
	});

	test('[case-sensitive-tag-name-issue-4314-003] an HTML element in lower case is not reported', async () => {
		const { violations } = await mlRuleTest(rule, '<template><div></div></template>', vue);
		expect(violations).toStrictEqual([]);
	});
});
