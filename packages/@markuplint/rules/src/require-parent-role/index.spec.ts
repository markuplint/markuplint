import { mlRuleTest } from 'markuplint';
import { describe, test, expect } from 'vitest';

import rule from './index.js';

test('[require-parent-role-valid-001] correct parent context', async () => {
	expect((await mlRuleTest(rule, '<div role="listbox"><div role="option"></div></div>')).violations).toStrictEqual(
		[],
	);
});

test('[require-parent-role-valid-002] no role attr', async () => {
	expect((await mlRuleTest(rule, '<div></div>')).violations).toStrictEqual([]);
});

describe('the parent is looked for in the tree of the element', () => {
	test('[require-parent-role-issue-4506-001] an element at the top of the content of a template has no parent to judge', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<div role="list"><template><div role="listitem">x</div></template></div>',
		);
		expect(violations).toStrictEqual([]);
	});

	test('[require-parent-role-issue-4506-002] an element in the content of a template is judged by its parent in the content', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<template><div role="list"><div role="listitem">x</div></div></template>',
		);
		expect(violations).toStrictEqual([]);
	});

	test('[require-parent-role-issue-4506-003] the host of a declarative shadow root is the parent of its top elements', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<div role="list"><template shadowrootmode="open"><div role="listitem">x</div></template></div>',
		);
		expect(violations).toStrictEqual([]);
	});

	test('[require-parent-role-issue-4506-004] a host of a declarative shadow root without the role is reported', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<div><template shadowrootmode="open"><div role="listitem">x</div></template></div>',
		);
		expect(violations).toStrictEqual([
			{
				severity: 'error',
				line: 1,
				col: 49,
				message:
					'The "listitem" role requires an accessibility parent with one of the roles: "directory", "list"',
				raw: 'listitem',
			},
		]);
	});
});
