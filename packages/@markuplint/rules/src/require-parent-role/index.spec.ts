import { mlRuleTest } from 'markuplint';
import { describe, expect, test } from 'vitest';

import rule from './index.js';

test('[require-parent-role-001] correct parent context', async () => {
	expect((await mlRuleTest(rule, '<div role="listbox"><div role="option"></div></div>')).violations).toStrictEqual(
		[],
	);
});

test('[require-parent-role-002] no role attr', async () => {
	expect((await mlRuleTest(rule, '<div></div>')).violations).toStrictEqual([]);
});

describe('an element that aria-owns refers to is a child of the element that refers to it', () => {
	test('[require-parent-role-003] an option that a listbox owns through aria-owns', async () => {
		expect(
			(
				await mlRuleTest(
					rule,
					'<div><div role="listbox" aria-owns="existing-id nonexistent-id">Listbox</div><div id="existing-id" role="option">Option 1</div></div>',
				)
			).violations,
		).toStrictEqual([]);
	});

	test('[require-parent-role-004] an option in a generic that a listbox owns through aria-owns', async () => {
		expect(
			(
				await mlRuleTest(
					rule,
					'<div><div role="listbox" aria-owns="id1"></div><div id="id1"><div><div role="option">option text</div></div></div></div>',
				)
			).violations,
		).toStrictEqual([]);
	});

	test('[require-parent-role-005] an option that an element other than a listbox owns', async () => {
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

	test('[require-parent-role-006] the first element in tree order that refers to it is the owner', async () => {
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

	test('[require-parent-role-007] aria-owns on a hidden element is not resolved', async () => {
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

	test('[require-parent-role-008] aria-owns that refers to an element hidden from all users is not resolved', async () => {
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

	test('[require-parent-role-009] references of aria-owns that form a cycle are ignored', async () => {
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
	test('[require-parent-role-010] an element at the top of the content of a template has no parent to judge', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<div role="list"><template><div role="listitem">x</div></template></div>',
		);
		expect(violations).toStrictEqual([]);
	});

	test('[require-parent-role-011] an element in the content of a template is judged by its parent in the content', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<template><div role="list"><div role="listitem">x</div></div></template>',
		);
		expect(violations).toStrictEqual([]);
	});

	test('[require-parent-role-012] the host of a declarative shadow root is the parent of its top elements', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<div role="list"><template shadowrootmode="open"><div role="listitem">x</div></template></div>',
		);
		expect(violations).toStrictEqual([]);
	});

	test('[require-parent-role-013] a host of a declarative shadow root without the role is reported', async () => {
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

test('[require-parent-role-014] the roles are shown as written (`list` is also a keyword) with locale ja', async () => {
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

test('[require-parent-role-015] JSX: the parent whose role is not known until it is rendered may be the required one', async () => {
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

test('[require-parent-role-016] JSX: an ancestor whose role is not known does not hide the parent that the markup tells', async () => {
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
	const v13 = { parser, ruleCommonSettings: { ariaVersion: '1.3' as const } };
	const v12 = { parser, ruleCommonSettings: { ariaVersion: '1.2' as const } };
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

	test('[require-parent-role-017] an unknown ancestor above a group may be the menu of the chain "menu > group"', async () => {
		const source = '<div role={props.role}><div role="group"><div role="menuitem">a</div></div></div>';
		expect((await mlRuleTest(rule, source, v13)).violations).toStrictEqual([]);

		// Control: the ancestor above the group is a role that the markup tells, and it is not a menu
		const known = '<div role="list"><div role="group"><div role="menuitem">a</div></div></div>';
		expect((await mlRuleTest(rule, known, v13)).violations).toStrictEqual(menuitem(47));
	});

	test('[require-parent-role-018] the walk past presentational ancestors ends at the top without an unknown one', async () => {
		const unknown = '<div {...props}><div role="presentation"><div role="listitem">a</div></div></div>';
		expect((await mlRuleTest(rule, unknown, v13)).violations).toStrictEqual([]);

		// Control: nothing is above the presentational ancestor
		const known = '<div role="presentation"><div role="listitem">a</div></div>';
		expect((await mlRuleTest(rule, known, v13)).violations).toStrictEqual(listitem(37));
	});

	test('[require-parent-role-019] an element that an aria-owns of an unknown element refers to may be its child', async () => {
		const unknown = '<><div role={props.role} aria-owns="i"></div><div role="listitem" id="i">a</div></>';
		expect((await mlRuleTest(rule, unknown, v13)).violations).toStrictEqual([]);

		// Control: the owner has a role that the markup tells, and it is not a list
		const known = '<><div role="group" aria-owns="i"></div><div role="listitem" id="i">a</div></>';
		expect((await mlRuleTest(rule, known, v13)).violations).toStrictEqual(listitem(52));
	});

	test('[require-parent-role-020] a generic between the unknown ancestor and the element is transparent in ARIA 1.3 only', async () => {
		const source = '<div role={props.role}><div><div role="listitem">a</div></div></div>';
		expect((await mlRuleTest(rule, source, v13)).violations).toStrictEqual([]);
		expect((await mlRuleTest(rule, source, v12)).violations).toStrictEqual(listitem(40));
	});

	test('[require-parent-role-021] an unknown ancestor between the group and the element only passes the context through in the chain "menu > group"', async () => {
		const source =
			'<div role="menu"><div role="group"><div role={props.role}><div role="menuitem">a</div></div></div></div>';
		expect((await mlRuleTest(rule, source, v13)).violations).toStrictEqual([]);
	});

	test('[require-parent-role-022] a long run of unknown ancestors is judged without revisiting them', async () => {
		const depth = 80;
		const wrap = (inner: string) => `${'<div {...props}>'.repeat(depth)}${inner}${'</div>'.repeat(depth)}`;
		// The chain "menu > group" needs two of the unknown ancestors, whichever of them they are
		const source = `<div role="button">${wrap('<div role="group"><div role="menuitem">a</div></div>')}</div>`;
		expect((await mlRuleTest(rule, source, v13)).violations).toStrictEqual([]);
	}, 5000);

	test('[require-parent-role-023] a role that a spread attribute after it may override is not judged on the element itself', async () => {
		const unknown = '<div><div role="listitem" {...props}>a</div></div>';
		expect((await mlRuleTest(rule, unknown, v13)).violations).toStrictEqual([]);

		// Control: the spread comes before the role attribute, so the role is the one written
		const known = '<div><div {...props} role="listitem">a</div></div>';
		expect((await mlRuleTest(rule, known, v13)).violations).toStrictEqual(listitem(28));
	});

	test('[require-parent-role-024] a spread attribute after the role attribute of the parent may override the role', async () => {
		const unknown = '<div role="group" {...props}><div role="listitem">a</div></div>';
		expect((await mlRuleTest(rule, unknown, v13)).violations).toStrictEqual([]);

		// Control: the spread comes before the role attribute, so the role is the one written
		const known = '<div {...props} role="group"><div role="listitem">a</div></div>';
		expect((await mlRuleTest(rule, known, v13)).violations).toStrictEqual(listitem(41));
	});
});

describe('the slot of a declarative shadow root', () => {
	const svelte = { parser: { '.*': '@markuplint/svelte-parser' } };

	const REQUIRES_LIST =
		'The "listitem" role requires an accessibility parent with one of the roles: "directory", "list"';

	function reportedAt(col: number) {
		return { severity: 'error', line: 1, col, message: REQUIRES_LIST, raw: 'listitem' };
	}

	test('[require-parent-role-025] the fallback content of a slot is rendered in the host, which has the required role', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<div role="list"><template shadowrootmode="open"><slot><div role="listitem">fb</div></slot></template></div>',
		);
		expect(violations).toStrictEqual([]);
	});

	test('[require-parent-role-026] a host that does not have the required role is still reported', async () => {
		const code =
			'<div role="group"><template shadowrootmode="open"><slot><div role="listitem">fb</div></slot></template></div>';
		const { violations } = await mlRuleTest(rule, code);
		expect(violations).toStrictEqual([reportedAt(68)]);
	});

	test('[require-parent-role-027] a light child that a slot takes is rendered where the slot is', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<div role="list"><template shadowrootmode="open"><slot></slot></template><div role="listitem">a</div></div>',
		);
		expect(violations).toStrictEqual([]);
	});

	test('[require-parent-role-028] the parent of a light child is the parent of the slot that takes it', async () => {
		const code =
			'<div role="list"><template shadowrootmode="open"><div role="group"><slot></slot></div></template><div role="listitem">a</div></div>';
		const { violations } = await mlRuleTest(rule, code);
		expect(violations).toStrictEqual([reportedAt(109)]);
	});

	test('[require-parent-role-029] a light child that no slot takes is not rendered, so there is no parent to judge', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<div role="group"><template shadowrootmode="open"><slot name="x"></slot></template><div role="listitem">a</div></div>',
		);
		expect(violations).toStrictEqual([]);
	});

	test('[require-parent-role-030] a slot between the element and the parent is passed through without a shadow root', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<div role="list"><slot><div role="listitem">fb</div></slot></div>',
		);
		expect(violations).toStrictEqual([]);
	});

	test('[require-parent-role-031] a slot of a framework is passed through too', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<div role="list"><template shadowrootmode="open"><slot><div role="listitem">fb</div></slot></template></div>',
			svelte,
		);
		expect(violations).toStrictEqual([]);
	});

	test('[require-parent-role-032] a light child is judged against the host when the assignment is not known', async () => {
		const code =
			'<div role="group"><template shadowrootmode="open" shadowrootslotassignment="manual"><slot></slot></template><div role="listitem">a</div></div>';
		const { violations } = await mlRuleTest(rule, code);
		expect(violations).toStrictEqual([reportedAt(120)]);
	});
});

describe('a template that Vue renders away', () => {
	/**
	 * What the framework renders away is not an element of the output, so what is written in it has the
	 * parent that the element above has: Vue renders a `<template>` that has `v-if`, `v-else-if`, `v-else`,
	 * `v-for` or `v-slot` away, and JSX and Astro a fragment.
	 */
	const vue = {
		parser: { '.*': '@markuplint/vue-parser' },
		specs: { '.*': '@markuplint/vue-spec' },
		pretenders: [{ selector: 'Menu', as: { element: 'div', attrs: [{ name: 'role', value: 'menu' }] } }],
	};
	const vueWithoutSpec = { parser: vue.parser, pretenders: vue.pretenders };

	const REQUIRES_MENU =
		'The "menuitem" role requires an accessibility parent with one of the roles: "menu", "menubar", "menu > group", "menubar > group"';

	const item = '<button type="button" role="menuitem">a</button>';

	describe.each([
		['with @markuplint/vue-spec', vue],
		['without @markuplint/vue-spec', vueWithoutSpec],
	])('Vue %s', (_, config) => {
		test.each([
			['v-if', `<div role="menu"><template v-if="x">${item}</template></div>`],
			['v-else-if', `<div role="menu"><template v-else-if="x">${item}</template></div>`],
			['v-else', `<div role="menu"><template v-else>${item}</template></div>`],
			['v-for', `<div role="menu"><template v-for="i in xs" :key="i">${item}</template></div>`],
			['a default slot', `<Menu><template #default>${item}</template></Menu>`],
			['a named slot', `<Menu><template #item>${item}</template></Menu>`],
			['v-slot', `<Menu><template v-slot:item="{ a }">${item}</template></Menu>`],
			[
				'nested',
				`<div role="menu"><template v-if="x"><template v-for="i in xs">${item}</template></template></div>`,
			],
			['v-if and v-slot', `<Menu><template #default v-if="x">${item}</template></Menu>`],
			['v-if on the element', `<div role="menu">${item.replace('<button', '<button v-if="x"')}</div>`],
			['role="none"', `<div role="menu"><div role="none">${item}</div></div>`],
			['a role on the template', `<div role="menu"><template v-if="x" role="none">${item}</template></div>`],
		])('[require-parent-role-033] %s does not stop the parent role', async (_, code) => {
			const { violations } = await mlRuleTest(rule, `<template>${code}</template>`, config);
			expect(violations).toStrictEqual([]);
		});

		test('[require-parent-role-034] a group in a template that is rendered away is the parent', async () => {
			const { violations } = await mlRuleTest(
				rule,
				`<template><div role="menu"><template v-if="x"><div role="group"><button type="button" role="menuitemradio" aria-checked="true">g</button></div></template></div></template>`,
				config,
			);
			expect(violations).toStrictEqual([]);
		});

		test.each([
			['has no directive', '<template>', 66],
			['has v-show', '<template v-show="x">', 77],
			['has a bound attribute', '<template :id="x">', 74],
		])('[require-parent-role-035] a template that %s stays an element in the tree', async (_, open, col) => {
			const { violations } = await mlRuleTest(
				rule,
				`<template><div role="menu">${open}${item}</template></div></template>`,
				config,
			);
			expect(violations).toStrictEqual([
				{ severity: 'error', line: 1, col, message: REQUIRES_MENU, raw: 'menuitem' },
			]);
		});

		test('[require-parent-role-036] what is above the template that is rendered away is still judged', async () => {
			const { violations } = await mlRuleTest(
				rule,
				`<template><div role="group"><template v-if="x">${item}</template></div></template>`,
				config,
			);
			expect(violations).toStrictEqual([
				{
					severity: 'error',
					line: 1,
					col: 76,
					message: REQUIRES_MENU,
					raw: 'menuitem',
				},
			]);
		});
	});

	describe('Fragments', () => {
		test('[require-parent-role-037] a fragment of JSX does not stop the parent role', async () => {
			const { violations } = await mlRuleTest(rule, `const a = <div role="menu"><>${item}</></div>;`, {
				parser: { '.*': '@markuplint/jsx-parser' },
			});
			expect(violations).toStrictEqual([]);
		});

		test.each([
			['<Fragment>', `<div role="menu"><Fragment>${item}</Fragment></div>`],
			['<>', `<div role="menu"><>${item}</></div>`],
		])('[require-parent-role-038] a fragment of Astro (%s) does not stop the parent role', async (_, code) => {
			const { violations } = await mlRuleTest(rule, code, { parser: { '.*': '@markuplint/astro-parser' } });
			expect(violations).toStrictEqual([]);
		});

		test('[require-parent-role-039] a fragment of JSX does not hide a parent that lacks the role', async () => {
			const { violations } = await mlRuleTest(rule, `const a = <div role="group"><>${item}</></div>;`, {
				parser: { '.*': '@markuplint/jsx-parser' },
			});
			expect(violations.map(v => v.raw)).toStrictEqual(['menuitem']);
		});
	});
});
