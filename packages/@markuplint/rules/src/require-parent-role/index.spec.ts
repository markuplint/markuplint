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

test('[require-parent-role-issue-4789-001] JSX: the parent whose role is not known until it is rendered may be the required one', async () => {
	const parser = { '.*': '@markuplint/jsx-parser' };
	const source = [
		'<>',
		'<div role={props.role}><div role="listitem">a</div></div>',
		'<div {...props}><div role="listitem">b</div></div>',
		'<div role={props.role}><div role="presentation"><div role="listitem">c</div></div></div>',
		'</>',
	].join('\n');
	expect((await mlRuleTest(rule, source, { parser })).violations).toStrictEqual([]);

	// Control: the parent whose role the markup tells is not the required one
	const { violations } = await mlRuleTest(rule, '<div role="group"><div role="listitem">a</div></div>', { parser });
	expect(violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 30,
			message: 'The "listitem" role requires an accessibility parent with one of the roles: "directory", "list"',
			raw: 'listitem',
		},
	]);
});

test('[require-parent-role-issue-4789-002] JSX: an ancestor whose role is not known does not hide the parent that the markup tells', async () => {
	const { violations } = await mlRuleTest(
		rule,
		'<div role={props.role}><div role="group"><div role="listitem">a</div></div></div>',
		{ parser: { '.*': '@markuplint/jsx-parser' } },
	);
	expect(violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 53,
			message: 'The "listitem" role requires an accessibility parent with one of the roles: "directory", "list"',
			raw: 'listitem',
		},
	]);
});

describe('an ancestor whose role is not known until it is rendered', () => {
	const parser = { '.*': '@markuplint/jsx-parser' };
	const v13 = { parser, rule: { options: { version: '1.3' as const } } };
	const v12 = { parser, rule: { options: { version: '1.2' as const } } };
	const menuitem = (col: number) => [
		{
			severity: 'error',
			line: 1,
			col,
			message:
				'The "menuitem" role requires an accessibility parent with one of the roles: "menu", "menubar", "menu > group", "menubar > group"',
			raw: 'menuitem',
		},
	];
	const listitem = (col: number) => [
		{
			severity: 'error',
			line: 1,
			col,
			message: 'The "listitem" role requires an accessibility parent with one of the roles: "directory", "list"',
			raw: 'listitem',
		},
	];

	test('[require-parent-role-issue-4789-003] an unknown ancestor above a group may be the menu of the chain "menu > group"', async () => {
		const source = '<div role={props.role}><div role="group"><div role="menuitem">a</div></div></div>';
		expect((await mlRuleTest(rule, source, v13)).violations).toStrictEqual([]);

		// Control: the ancestor above the group is a role that the markup tells, and it is not a menu
		const known = '<div role="list"><div role="group"><div role="menuitem">a</div></div></div>';
		expect((await mlRuleTest(rule, known, v13)).violations).toStrictEqual(menuitem(47));
	});

	test('[require-parent-role-issue-4789-004] the walk past presentational ancestors ends at the top without an unknown one', async () => {
		const unknown = '<div {...props}><div role="presentation"><div role="listitem">a</div></div></div>';
		expect((await mlRuleTest(rule, unknown, v13)).violations).toStrictEqual([]);

		// Control: nothing is above the presentational ancestor
		const known = '<div role="presentation"><div role="listitem">a</div></div>';
		expect((await mlRuleTest(rule, known, v13)).violations).toStrictEqual(listitem(37));
	});

	test('[require-parent-role-issue-4789-005] an element that an aria-owns of an unknown element refers to may be its child', async () => {
		const unknown = '<><div role={props.role} aria-owns="i"></div><div role="listitem" id="i">a</div></>';
		expect((await mlRuleTest(rule, unknown, v13)).violations).toStrictEqual([]);

		// Control: the owner has a role that the markup tells, and it is not a list
		const known = '<><div role="group" aria-owns="i"></div><div role="listitem" id="i">a</div></>';
		expect((await mlRuleTest(rule, known, v13)).violations).toStrictEqual(listitem(52));
	});

	test('[require-parent-role-issue-4789-006] a generic between the unknown ancestor and the element is transparent in ARIA 1.3 only', async () => {
		const source = '<div role={props.role}><div><div role="listitem">a</div></div></div>';
		expect((await mlRuleTest(rule, source, v13)).violations).toStrictEqual([]);
		expect((await mlRuleTest(rule, source, v12)).violations).toStrictEqual(listitem(40));
	});

	test('[require-parent-role-issue-4789-007] an unknown ancestor between the group and the element only passes the context through in the chain "menu > group"', async () => {
		const source =
			'<div role="menu"><div role="group"><div role={props.role}><div role="menuitem">a</div></div></div></div>';
		expect((await mlRuleTest(rule, source, v13)).violations).toStrictEqual([]);
	});

	test('[require-parent-role-issue-4789-008] a long run of unknown ancestors is judged without revisiting them', async () => {
		const depth = 80;
		const wrap = (inner: string) => `${'<div {...props}>'.repeat(depth)}${inner}${'</div>'.repeat(depth)}`;
		// The chain "menu > group" needs two of the unknown ancestors, whichever of them are they
		const source = `<div role="button">${wrap('<div role="group"><div role="menuitem">a</div></div>')}</div>`;
		expect((await mlRuleTest(rule, source, v13)).violations).toStrictEqual([]);
	}, 5000);

	test('[require-parent-role-issue-4789-009] a role that a spread attribute after it may override is not judged on the element itself', async () => {
		const unknown = '<div><div role="listitem" {...props}>a</div></div>';
		expect((await mlRuleTest(rule, unknown, v13)).violations).toStrictEqual([]);

		// Control: the spread comes before the role attribute, so the role is the one written
		const known = '<div><div {...props} role="listitem">a</div></div>';
		expect((await mlRuleTest(rule, known, v13)).violations).toStrictEqual(listitem(28));
	});

	test('[require-parent-role-issue-4789-010] a spread attribute after the role attribute of the parent may override the role', async () => {
		const unknown = '<div role="group" {...props}><div role="listitem">a</div></div>';
		expect((await mlRuleTest(rule, unknown, v13)).violations).toStrictEqual([]);

		// Control: the spread comes before the role attribute, so the role is the one written
		const known = '<div {...props} role="group"><div role="listitem">a</div></div>';
		expect((await mlRuleTest(rule, known, v13)).violations).toStrictEqual(listitem(41));
	});
});
