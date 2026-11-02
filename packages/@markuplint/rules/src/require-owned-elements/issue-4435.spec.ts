import { mlRuleTest } from 'markuplint';
import { test, expect } from 'vitest';

import rule from './index.js';

test('[require-owned-elements-issue-4435-001] aria-busy that is a literal is what a string is: the contents are loading', async () => {
	const { violations } = await mlRuleTest(rule, '<ul role="list" aria-busy={true}></ul>', {
		parser: { '.*': '@markuplint/jsx-parser' },
	});
	expect(violations).toStrictEqual([]);
});

test('[require-owned-elements-issue-4435-002] aria-busy of a string literal is the same', async () => {
	const { violations } = await mlRuleTest(rule, '<ul role="list" aria-busy={"true"}></ul>', {
		parser: { '.*': '@markuplint/jsx-parser' },
	});
	expect(violations).toStrictEqual([]);
});

test('[require-owned-elements-issue-4435-003] aria-busy that is false is not', async () => {
	const { violations } = await mlRuleTest(rule, '<ul role="list" aria-busy={false}></ul>', {
		parser: { '.*': '@markuplint/jsx-parser' },
	});
	expect(violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 1,
			message: 'The child element requires the "listitem" role. Or, require aria-busy="true"',
			raw: '<ul role="list" aria-busy={false}>',
		},
	]);
});

test('[require-owned-elements-issue-4435-004] the component that has aria-busy={true} is as the element is', async () => {
	const { violations } = await mlRuleTest(rule, '<BusyList />', {
		parser: { '.*': '@markuplint/jsx-parser' },
		pretenders: [
			{
				selector: 'BusyList',
				as: {
					element: 'ul',
					attrs: [
						{ name: 'role', value: 'list' },
						{ name: 'aria-busy', value: { expression: 'true' } },
					],
				},
			},
		],
	});
	expect(violations).toStrictEqual([]);
});

test('[require-owned-elements-issue-4435-005] the component that has aria-busy={"true"} is as the element is', async () => {
	const { violations } = await mlRuleTest(rule, '<BusyList />', {
		parser: { '.*': '@markuplint/jsx-parser' },
		pretenders: [
			{
				selector: 'BusyList',
				as: {
					element: 'ul',
					attrs: [
						{ name: 'role', value: 'list' },
						{ name: 'aria-busy', value: { expression: '"true"' } },
					],
				},
			},
		],
	});
	expect(violations).toStrictEqual([]);
});

test('[require-owned-elements-issue-4435-006] the component that has aria-busy={false} is as the element is', async () => {
	const { violations } = await mlRuleTest(rule, '<BusyList />', {
		parser: { '.*': '@markuplint/jsx-parser' },
		pretenders: [
			{
				selector: 'BusyList',
				as: {
					element: 'ul',
					attrs: [
						{ name: 'role', value: 'list' },
						{ name: 'aria-busy', value: { expression: 'false' } },
					],
				},
			},
		],
	});
	expect(violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 1,
			message: 'The child element requires the "listitem" role. Or, require aria-busy="true"',
			raw: '<BusyList />',
		},
	]);
});

test('[require-owned-elements-issue-4435-007] a component that no pretender resolved may render the owned element', async () => {
	const { violations } = await mlRuleTest(rule, '<div role="tablist" aria-label="Examples"><Tab /></div>', {
		parser: { '.*': '@markuplint/jsx-parser' },
	});
	expect(violations).toStrictEqual([]);
});

test('[require-owned-elements-issue-4435-008] an element that is not the owned element is reported', async () => {
	const { violations } = await mlRuleTest(rule, '<div role="tablist"><span></span></div>', {
		parser: { '.*': '@markuplint/jsx-parser' },
	});
	expect(violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 1,
			message: 'The "tablist" role expects the "tab" role',
			raw: '<div role="tablist">',
		},
	]);
});
