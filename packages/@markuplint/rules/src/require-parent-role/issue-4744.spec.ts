import { mlRuleTest } from 'markuplint';
import { describe, test, expect } from 'vitest';

import rule from './index.js';

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
		['nested', `<div role="menu"><template v-if="x"><template v-for="i in xs">${item}</template></template></div>`],
		['v-if and v-slot', `<Menu><template #default v-if="x">${item}</template></Menu>`],
		['v-if on the element', `<div role="menu">${item.replace('<button', '<button v-if="x"')}</div>`],
		['role="none"', `<div role="menu"><div role="none">${item}</div></div>`],
		['a role on the template', `<div role="menu"><template v-if="x" role="none">${item}</template></div>`],
	])('[require-parent-role-issue-4744-001] %s does not stop the parent role', async (_, code) => {
		const { violations } = await mlRuleTest(rule, `<template>${code}</template>`, config);
		expect(violations).toStrictEqual([]);
	});

	test('[require-parent-role-issue-4744-002] a group in a template that is rendered away is the parent', async () => {
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
	])('[require-parent-role-issue-4744-003] a template that %s stays an element in the tree', async (_, open, col) => {
		const { violations } = await mlRuleTest(
			rule,
			`<template><div role="menu">${open}${item}</template></div></template>`,
			config,
		);
		expect(violations).toStrictEqual([
			{ severity: 'error', line: 1, col, message: REQUIRES_MENU, raw: 'menuitem' },
		]);
	});

	test('[require-parent-role-issue-4744-004] what is above the template that is rendered away is still judged', async () => {
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
	test('[require-parent-role-issue-4744-005] a fragment of JSX does not stop the parent role', async () => {
		const { violations } = await mlRuleTest(rule, `const a = <div role="menu"><>${item}</></div>;`, {
			parser: { '.*': '@markuplint/jsx-parser' },
		});
		expect(violations).toStrictEqual([]);
	});

	test.each([
		['<Fragment>', `<div role="menu"><Fragment>${item}</Fragment></div>`],
		['<>', `<div role="menu"><>${item}</></div>`],
	])(
		'[require-parent-role-issue-4744-006] a fragment of Astro (%s) does not stop the parent role',
		async (_, code) => {
			const { violations } = await mlRuleTest(rule, code, { parser: { '.*': '@markuplint/astro-parser' } });
			expect(violations).toStrictEqual([]);
		},
	);

	test('[require-parent-role-issue-4744-007] a fragment of JSX does not hide a parent that lacks the role', async () => {
		const { violations } = await mlRuleTest(rule, `const a = <div role="group"><>${item}</></div>;`, {
			parser: { '.*': '@markuplint/jsx-parser' },
		});
		expect(violations.map(v => v.raw)).toStrictEqual(['menuitem']);
	});
});
