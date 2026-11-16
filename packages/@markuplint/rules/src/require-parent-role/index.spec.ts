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

describe('an element that aria-owns refers to is a child of the element that refers to it', () => {
	test('[require-parent-role-valid-003] an option that a listbox owns through aria-owns', async () => {
		expect(
			(
				await mlRuleTest(
					rule,
					'<div><div role="listbox" aria-owns="existing-id nonexistent-id">Listbox</div><div id="existing-id" role="option">Option 1</div></div>',
				)
			).violations,
		).toStrictEqual([]);
	});

	test('[require-parent-role-valid-004] an option in a generic that a listbox owns through aria-owns', async () => {
		expect(
			(
				await mlRuleTest(
					rule,
					'<div><div role="listbox" aria-owns="id1"></div><div id="id1"><div><div role="option">option text</div></div></div></div>',
				)
			).violations,
		).toStrictEqual([]);
	});

	test('[require-parent-role-invalid-001] an option that an element other than a listbox owns', async () => {
		expect(
			(
				await mlRuleTest(
					rule,
					'<div><div role="listbox"><div role="list" aria-owns="o"></div></div><div id="o" role="option"></div></div>',
				)
			).violations,
		).toStrictEqual([
			{
				severity: 'error',
				line: 1,
				col: 87,
				message:
					'The "option" role requires an accessibility parent with one of the roles: "listbox", "listbox > group"',
				raw: 'option',
			},
		]);
	});

	test('[require-parent-role-invalid-002] the first element in tree order that refers to it is the owner', async () => {
		expect(
			(
				await mlRuleTest(
					rule,
					'<div><div role="list" aria-owns="o"></div><div role="listbox" aria-owns="o"></div><div id="o" role="option"></div></div>',
				)
			).violations,
		).toStrictEqual([
			{
				severity: 'error',
				line: 1,
				col: 101,
				message:
					'The "option" role requires an accessibility parent with one of the roles: "listbox", "listbox > group"',
				raw: 'option',
			},
		]);
	});

	test('[require-parent-role-invalid-003] aria-owns on a hidden element is not resolved', async () => {
		expect(
			(
				await mlRuleTest(
					rule,
					'<div><div role="listbox" aria-owns="o" hidden></div><div id="o" role="option"></div></div>',
				)
			).violations,
		).toStrictEqual([
			{
				severity: 'error',
				line: 1,
				col: 71,
				message:
					'The "option" role requires an accessibility parent with one of the roles: "listbox", "listbox > group"',
				raw: 'option',
			},
		]);
	});

	test('[require-parent-role-invalid-004] aria-owns that refers to an element hidden from all users is not resolved', async () => {
		expect(
			(
				await mlRuleTest(
					rule,
					'<div><div role="listbox" aria-owns="o"></div><div hidden><div id="o" role="option"></div></div></div>',
				)
			).violations,
		).toStrictEqual([
			{
				severity: 'error',
				line: 1,
				col: 76,
				message:
					'The "option" role requires an accessibility parent with one of the roles: "listbox", "listbox > group"',
				raw: 'option',
			},
		]);
	});

	test('[require-parent-role-invalid-005] references of aria-owns that form a cycle are ignored', async () => {
		expect(
			(
				await mlRuleTest(
					rule,
					'<div><div id="a" role="listbox" aria-owns="b"></div><div id="b" role="option" aria-owns="a"></div></div>',
				)
			).violations,
		).toStrictEqual([
			{
				severity: 'error',
				line: 1,
				col: 71,
				message:
					'The "option" role requires an accessibility parent with one of the roles: "listbox", "listbox > group"',
				raw: 'option',
			},
		]);
	});
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

test('[require-parent-role-issue-4584-001] the roles are shown as written (`list` is also a keyword) with locale ja', async () => {
	const { violations } = await mlRuleTest(
		rule,
		'<div><template shadowrootmode="open"><div role="listitem">x</div></template></div>',
		undefined,
		false,
		'ja',
	);

	expect(violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 49,
			message:
				'ロール「listitem」に次のロールのいずれかを持つアクセシビリティ親要素: 「directory」「list」が必要です',
			raw: 'listitem',
		},
	]);
});
