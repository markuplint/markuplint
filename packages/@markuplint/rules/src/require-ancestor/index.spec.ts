import { mlRuleTest } from 'markuplint';
import { describe, test, expect } from 'vitest';

import rule from './index.js';

test('[require-ancestor-issue-3670-001] area outside map is invalid', async () => {
	const { violations } = await mlRuleTest(rule, '<div><area alt="x" href="#"></div>');
	expect(violations).toStrictEqual([
		expect.objectContaining({
			severity: 'error',
			message: 'The "area" element must appear as a descendant of the "map" element',
		}),
	]);
});

test('[require-ancestor-issue-3670-002] area inside map is valid', async () => {
	const { violations } = await mlRuleTest(rule, '<map name="m"><area alt="x" href="#"></map>');
	expect(violations).toStrictEqual([]);
});

test('[require-ancestor-issue-3670-003] area inside deeply nested map has no descendantOf violation', async () => {
	const { violations } = await mlRuleTest(rule, '<map name="m"><div><p><area alt="x" href="#"></p></div></map>');
	expect(violations).toStrictEqual([]);
});

describe('the ancestor is required of an element that has a parent node in the file', () => {
	const jsx = { parser: { '.*': '@markuplint/jsx-parser' }, specs: { '.*': '@markuplint/react-spec' } };
	const vue = { parser: { '.*': '@markuplint/vue-parser' }, specs: { '.*': '@markuplint/vue-spec' } };
	const svelte = { parser: { '.*': '@markuplint/svelte-parser' }, specs: { '.*': '@markuplint/svelte-spec' } };
	const pug = { parser: { '.*': '@markuplint/pug-parser' } };
	const astro = { parser: { '.*': '@markuplint/astro-parser' } };
	const ejs = { parser: { '.*': '@markuplint/ejs-parser' } };

	test('[require-ancestor-issue-4528-001] area at the top of a partial is not reported', async () => {
		const { violations } = await mlRuleTest(rule, '<area alt="x" href="#">');
		expect(violations).toStrictEqual([]);
	});

	test('[require-ancestor-issue-4528-002] area at the top of a partial after another element is not reported', async () => {
		const { violations } = await mlRuleTest(rule, '<p>a</p><area alt="x" href="#">');
		expect(violations).toStrictEqual([]);
	});

	test('[require-ancestor-issue-4528-003] area in the body of a whole document is reported', async () => {
		const { violations } = await mlRuleTest(
			rule,
			[
				'<!doctype html>',
				'<html lang="en">',
				'<head><title>t</title></head>',
				'<body><area alt="x" href="#"></body>',
				'</html>',
			].join('\n'),
		);
		expect(violations).toStrictEqual([
			{
				severity: 'error',
				line: 4,
				col: 7,
				message: 'The "area" element must appear as a descendant of the "map" element',
				raw: '<area alt="x" href="#">',
			},
		]);
	});

	test('[require-ancestor-issue-4528-004] JSX: area at the top of a component is not reported', async () => {
		const { violations } = await mlRuleTest(rule, '<area alt="x" href="#" />', jsx);
		expect(violations).toStrictEqual([]);
	});

	test('[require-ancestor-issue-4528-005] JSX: area in a fragment at the top of a component is not reported', async () => {
		const { violations } = await mlRuleTest(rule, '<><area alt="x" href="#" /></>', jsx);
		expect(violations).toStrictEqual([]);
	});

	test('[require-ancestor-issue-4528-006] JSX: area in an expression in a fragment at the top of a component is not reported', async () => {
		const { violations } = await mlRuleTest(rule, '<>{xs.map(() => <area alt="x" href="#" />)}</>', jsx);
		expect(violations).toStrictEqual([]);
	});

	test('[require-ancestor-issue-4528-007] JSX: area in an expression in an element is reported', async () => {
		const { violations } = await mlRuleTest(rule, '<div>{xs.map(() => <area alt="x" href="#" />)}</div>', jsx);
		expect(violations).toStrictEqual([
			{
				severity: 'error',
				line: 1,
				col: 20,
				message: 'The "area" element must appear as a descendant of the "map" element',
				raw: '<area alt="x" href="#" />',
			},
		]);
	});

	test('[require-ancestor-issue-4528-008] JSX: area in a fragment in an element is reported', async () => {
		const { violations } = await mlRuleTest(rule, '<div><><area alt="x" href="#" /></></div>', jsx);
		expect(violations).toStrictEqual([
			{
				severity: 'error',
				line: 1,
				col: 8,
				message: 'The "area" element must appear as a descendant of the "map" element',
				raw: '<area alt="x" href="#" />',
			},
		]);
	});

	test('[require-ancestor-issue-4528-009] Vue: area at the top of the template of a component is not reported', async () => {
		const { violations } = await mlRuleTest(rule, '<template><area alt="x" href="#" /></template>', vue);
		expect(violations).toStrictEqual([]);
	});

	test('[require-ancestor-issue-4528-010] Vue: area in a template with a directive at the top of a component is not reported', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<template><template v-if="a"><area alt="x" href="#" /></template></template>',
			vue,
		);
		expect(violations).toStrictEqual([]);
	});

	test('[require-ancestor-issue-4528-011] Svelte: area in a block at the top of a component is not reported', async () => {
		const { violations } = await mlRuleTest(rule, '{#if a}<area alt="x" href="#" />{/if}', svelte);
		expect(violations).toStrictEqual([]);
	});

	test('[require-ancestor-issue-4528-012] Svelte: area in a block in an element is reported', async () => {
		const { violations } = await mlRuleTest(rule, '<div>{#if a}<area alt="x" href="#" />{/if}</div>', svelte);
		expect(violations).toStrictEqual([
			{
				severity: 'error',
				line: 1,
				col: 13,
				message: 'The "area" element must appear as a descendant of the "map" element',
				raw: '<area alt="x" href="#" />',
			},
		]);
	});

	test('[require-ancestor-issue-4528-013] Pug: area in a block at the top of a file is not reported', async () => {
		const { violations } = await mlRuleTest(rule, 'if a\n  area(alt="x" href="#")', pug);
		expect(violations).toStrictEqual([]);
	});

	test('[require-ancestor-issue-4528-014] Pug: area in a block in an element is reported', async () => {
		const { violations } = await mlRuleTest(rule, 'div\n  if a\n    area(alt="x" href="#")', pug);
		expect(violations).toStrictEqual([
			{
				severity: 'error',
				line: 3,
				col: 5,
				message: 'The "area" element must appear as a descendant of the "map" element',
				raw: 'area(alt="x" href="#")',
			},
		]);
	});

	test('[require-ancestor-issue-4528-015] JSX: area in nested fragments at the top of a component is not reported', async () => {
		const { violations } = await mlRuleTest(rule, '<><><area alt="x" href="#" /></></>', jsx);
		expect(violations).toStrictEqual([]);
	});

	test('[require-ancestor-issue-4528-016] JSX: area in nested fragments in an element is reported', async () => {
		const { violations } = await mlRuleTest(rule, '<div><><><area alt="x" href="#" /></></></div>', jsx);
		expect(violations).toStrictEqual([
			{
				severity: 'error',
				line: 1,
				col: 10,
				message: 'The "area" element must appear as a descendant of the "map" element',
				raw: '<area alt="x" href="#" />',
			},
		]);
	});

	test('[require-ancestor-issue-4528-017] JSX: area in a fragment in a map is valid', async () => {
		const { violations } = await mlRuleTest(rule, '<map name="m"><><area alt="x" href="#" /></></map>', jsx);
		expect(violations).toStrictEqual([]);
	});

	test('[require-ancestor-issue-4528-018] JSX: area in an expression in a map is valid', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<map name="m">{xs.map(() => <area alt="x" href="#" />)}</map>',
			jsx,
		);
		expect(violations).toStrictEqual([]);
	});

	test('[require-ancestor-issue-4528-019] Vue: area in nested templates with a directive at the top of a component is not reported', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<template><template v-if="a"><template v-for="b in c"><area alt="x" href="#" /></template></template></template>',
			vue,
		);
		expect(violations).toStrictEqual([]);
	});

	test('[require-ancestor-issue-4528-020] Astro: area at the top of a component is not reported', async () => {
		const { violations } = await mlRuleTest(rule, '<area alt="x" href="#" />', astro);
		expect(violations).toStrictEqual([]);
	});

	test('[require-ancestor-issue-4528-021] Astro: area in an element is reported', async () => {
		const { violations } = await mlRuleTest(rule, '<div><area alt="x" href="#" /></div>', astro);
		expect(violations).toStrictEqual([
			{
				severity: 'error',
				line: 1,
				col: 6,
				message: 'The "area" element must appear as a descendant of the "map" element',
				raw: '<area alt="x" href="#" />',
			},
		]);
	});

	test('[require-ancestor-issue-4528-022] EJS: area between the tags of a block at the top of a partial is not reported', async () => {
		const { violations } = await mlRuleTest(rule, '<% if (a) { %><area alt="x" href="#"><% } %>', ejs);
		expect(violations).toStrictEqual([]);
	});

	test('[require-ancestor-issue-4528-023] EJS: area between the tags of a block in an element is reported', async () => {
		const { violations } = await mlRuleTest(rule, '<div><% if (a) { %><area alt="x" href="#"><% } %></div>', ejs);
		expect(violations).toStrictEqual([
			{
				severity: 'error',
				line: 1,
				col: 20,
				message: 'The "area" element must appear as a descendant of the "map" element',
				raw: '<area alt="x" href="#">',
			},
		]);
	});

	test('[require-ancestor-issue-4528-024] area in a body element without a doctype is reported', async () => {
		const { violations } = await mlRuleTest(rule, '<body><area alt="x" href="#"></body>');
		expect(violations).toStrictEqual([
			{
				severity: 'error',
				line: 1,
				col: 7,
				message: 'The "area" element must appear as a descendant of the "map" element',
				raw: '<area alt="x" href="#">',
			},
		]);
	});
	test('[require-ancestor-issue-4528-025] JSX: area in React.Fragment at the top of a component is not reported', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<React.Fragment><area alt="x" href="#" /></React.Fragment>',
			jsx,
		);
		expect(violations).toStrictEqual([]);
	});

	test('[require-ancestor-issue-4528-026] JSX: area in Fragment at the top of a component is not reported', async () => {
		const { violations } = await mlRuleTest(rule, '<Fragment><area alt="x" href="#" /></Fragment>', jsx);
		expect(violations).toStrictEqual([]);
	});

	test('[require-ancestor-issue-4528-027] JSX: area in React.Fragment in an element is reported', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<div><React.Fragment><area alt="x" href="#" /></React.Fragment></div>',
			jsx,
		);
		expect(violations).toStrictEqual([
			{
				severity: 'error',
				line: 1,
				col: 22,
				message: 'The "area" element must appear as a descendant of the "map" element',
				raw: '<area alt="x" href="#" />',
			},
		]);
	});

	test('[require-ancestor-issue-4528-028] Astro: area in Fragment at the top of a component is not reported', async () => {
		const { violations } = await mlRuleTest(rule, '<Fragment><area alt="x" href="#" /></Fragment>', astro);
		expect(violations).toStrictEqual([]);
	});

	test('[require-ancestor-issue-4528-029] Astro: area in slot at the top of a component is not reported', async () => {
		const { violations } = await mlRuleTest(rule, '<slot><area alt="x" href="#" /></slot>', astro);
		expect(violations).toStrictEqual([]);
	});

	test('[require-ancestor-issue-4528-030] Vue: area in slot at the top of the template of a component is not reported', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<template><slot><area alt="x" href="#" /></slot></template>',
			vue,
		);
		expect(violations).toStrictEqual([]);
	});

	test('[require-ancestor-issue-4528-031] Vue: area in slot in an element is reported', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<template><div><slot><area alt="x" href="#" /></slot></div></template>',
			vue,
		);
		expect(violations).toStrictEqual([
			{
				severity: 'error',
				line: 1,
				col: 22,
				message: 'The "area" element must appear as a descendant of the "map" element',
				raw: '<area alt="x" href="#" />',
			},
		]);
	});
	test('[require-ancestor-issue-4528-032] JSX: area in a template element with a spread attribute at the top of a component is reported', async () => {
		const { violations } = await mlRuleTest(rule, '<template {...props}><area alt="x" href="#" /></template>', jsx);
		expect(violations).toStrictEqual([
			{
				severity: 'error',
				line: 1,
				col: 22,
				message: 'The "area" element must appear as a descendant of the "map" element',
				raw: '<area alt="x" href="#" />',
			},
		]);
	});

	test('[require-ancestor-issue-4528-033] an area element in the SVG namespace is not the HTML area element', async () => {
		const { violations } = await mlRuleTest(rule, '<div><svg><area /></svg></div>');
		expect(violations).toStrictEqual([]);
	});
});

describe('the ancestor is looked for in the tree of the element', () => {
	test('[require-ancestor-issue-4506-001] area in the content of a template under a map is not reported', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<map name="m"><template><area alt="x" href="#"></template></map>',
		);
		expect(violations).toStrictEqual([]);
	});

	test('[require-ancestor-issue-4506-002] area in the content of a template is not reported without a map outside', async () => {
		const { violations } = await mlRuleTest(rule, '<div><template><area alt="x" href="#"></template></div>');
		expect(violations).toStrictEqual([]);
	});

	test('[require-ancestor-issue-4506-003] area under a map in the content of a template is valid', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<template><map name="m"><area alt="x" href="#"></map></template>',
		);
		expect(violations).toStrictEqual([]);
	});

	test('[require-ancestor-issue-4506-004] area in the content of a template without a map in the content is not reported', async () => {
		const { violations } = await mlRuleTest(rule, '<template><div><area alt="x" href="#"></div></template>');
		expect(violations).toStrictEqual([]);
	});

	test('[require-ancestor-issue-4506-005] area in a declarative shadow root without a map in it is reported', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<div><template shadowrootmode="open"><area alt="x" href="#"></template></div>',
		);
		expect(violations).toStrictEqual([
			{
				severity: 'error',
				line: 1,
				col: 38,
				message: 'The "area" element must appear as a descendant of the "map" element',
				raw: '<area alt="x" href="#">',
			},
		]);
	});

	test('[require-ancestor-issue-4506-006] area in a declarative shadow root under a map outside is reported', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<map name="m"><div><template shadowrootmode="open"><area alt="x" href="#"></template></div></map>',
		);
		expect(violations).toStrictEqual([
			{
				severity: 'error',
				line: 1,
				col: 52,
				message: 'The "area" element must appear as a descendant of the "map" element',
				raw: '<area alt="x" href="#">',
			},
		]);
	});

	test('[require-ancestor-issue-4506-007] area in a declarative shadow root with a map in it is valid', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<div><template shadowrootmode="open"><map name="m"><area alt="x" href="#"></map></template></div>',
		);
		expect(violations).toStrictEqual([]);
	});

	test('[require-ancestor-issue-4506-008] area in a template that fails to attach a shadow root is not reported', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<ul><template shadowrootmode="open"><area alt="x" href="#"></template></ul>',
		);
		expect(violations).toStrictEqual([]);
	});

	test('[require-ancestor-issue-4506-009] area in a template in a declarative shadow root is not reported', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<div><template shadowrootmode="open"><template><area alt="x" href="#"></template></template></div>',
		);
		expect(violations).toStrictEqual([]);
	});

	test('[require-ancestor-issue-4506-010] a template of a template engine is an ordinary element of the climb', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<template><div><template v-if="x"><area alt="x" href="#" /></template></div></template>',
			{ parser: { '.*': '@markuplint/vue-parser' }, specs: { '.*': '@markuplint/vue-spec' } },
		);
		expect(violations).toStrictEqual([
			{
				severity: 'error',
				line: 1,
				col: 35,
				message: 'The "area" element must appear as a descendant of the "map" element',
				raw: '<area alt="x" href="#" />',
			},
		]);
	});
});

describe('a component whose output is not known may render the ancestor', () => {
	const jsx = { parser: { '.*': '@markuplint/jsx-parser' }, specs: { '.*': '@markuplint/react-spec' } };
	const vue = { parser: { '.*': '@markuplint/vue-parser' }, specs: { '.*': '@markuplint/vue-spec' } };
	const svelte = { parser: { '.*': '@markuplint/svelte-parser' }, specs: { '.*': '@markuplint/svelte-spec' } };
	const astro = { parser: { '.*': '@markuplint/astro-parser' } };
	const message = 'The "area" element must appear as a descendant of the "map" element';

	test('[require-ancestor-issue-4575-001] JSX: area directly under a component is not reported', async () => {
		const { violations } = await mlRuleTest(rule, '<Foo><area alt="x" href="#" /></Foo>', jsx);
		expect(violations).toStrictEqual([]);
	});

	test('[require-ancestor-issue-4575-002] Vue: area directly under a component is not reported', async () => {
		const { violations } = await mlRuleTest(rule, '<template><Foo><area alt="x" href="#" /></Foo></template>', vue);
		expect(violations).toStrictEqual([]);
	});

	test('[require-ancestor-issue-4575-003] JSX: area under a component that a pretender says is a map is not reported', async () => {
		const { violations } = await mlRuleTest(rule, '<Foo><area alt="x" href="#" /></Foo>', {
			...jsx,
			pretenders: [{ selector: 'Foo', as: 'map' }],
		});
		expect(violations).toStrictEqual([]);
	});

	test('[require-ancestor-issue-4575-004] JSX: area under a component that a pretender says is a div is reported', async () => {
		const { violations } = await mlRuleTest(rule, '<Foo><area alt="x" href="#" /></Foo>', {
			...jsx,
			pretenders: [{ selector: 'Foo', as: 'div' }],
		});
		expect(violations).toStrictEqual([
			{
				severity: 'error',
				line: 1,
				col: 6,
				message,
				raw: '<area alt="x" href="#" />',
			},
		]);
	});

	test('[require-ancestor-issue-4575-005] JSX: area under known elements below a component is not reported', async () => {
		const { violations } = await mlRuleTest(rule, '<div><Foo><p><area alt="x" href="#" /></p></Foo></div>', jsx);
		expect(violations).toStrictEqual([]);
	});

	test('[require-ancestor-issue-4575-006] JSX: area in an attribute of a component is not reported', async () => {
		const { violations } = await mlRuleTest(rule, '<div><Foo render={<area alt="x" href="#" />} /></div>', jsx);
		expect(violations).toStrictEqual([]);
	});

	test('[require-ancestor-issue-4575-007] JSX: area under known elements only is reported', async () => {
		const { violations } = await mlRuleTest(rule, '<div><p><area alt="x" href="#" /></p></div>', jsx);
		expect(violations).toStrictEqual([
			{
				severity: 'error',
				line: 1,
				col: 9,
				message,
				raw: '<area alt="x" href="#" />',
			},
		]);
	});

	test('[require-ancestor-issue-4575-008] JSX: area under a component in a map is valid', async () => {
		const { violations } = await mlRuleTest(rule, '<map name="m"><Foo><area alt="x" href="#" /></Foo></map>', jsx);
		expect(violations).toStrictEqual([]);
	});

	test('[require-ancestor-issue-4575-009] Vue: area under the component element is not reported', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<template><div><component :is="x"><area alt="x" href="#" /></component></div></template>',
			vue,
		);
		expect(violations).toStrictEqual([]);
	});

	test('[require-ancestor-issue-4575-010] Vue: area under a slot in an element is still reported', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<template><div><slot><area alt="x" href="#" /></slot></div></template>',
			vue,
		);
		expect(violations).toStrictEqual([
			{
				severity: 'error',
				line: 1,
				col: 22,
				message,
				raw: '<area alt="x" href="#" />',
			},
		]);
	});

	test('[require-ancestor-issue-4575-011] Svelte: area under a component is not reported', async () => {
		const { violations } = await mlRuleTest(rule, '<div><Foo><area alt="x" href="#" /></Foo></div>', svelte);
		expect(violations).toStrictEqual([]);
	});

	test('[require-ancestor-issue-4575-012] Astro: area under a component is not reported', async () => {
		const { violations } = await mlRuleTest(rule, '<div><Foo><area alt="x" href="#" /></Foo></div>', astro);
		expect(violations).toStrictEqual([]);
	});

	test('[require-ancestor-issue-4575-013] JSX: area in a fragment under a component is not reported', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<Foo><React.Fragment><area alt="x" href="#" /></React.Fragment></Foo>',
			jsx,
		);
		expect(violations).toStrictEqual([]);
	});

	test('[require-ancestor-issue-4575-014] Vue: area in a template with a directive under a component is not reported', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<template><Foo><template v-if="a"><area alt="x" href="#" /></template></Foo></template>',
			vue,
		);
		expect(violations).toStrictEqual([]);
	});

	test('[require-ancestor-issue-4575-015] Vue: area under a built-in component is not reported', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<template><div><Transition><area alt="x" href="#" /></Transition></div></template>',
			vue,
		);
		expect(violations).toStrictEqual([]);
	});

	test('[require-ancestor-issue-4575-016] JSX: area under a component that a pretender says is another component is not reported', async () => {
		const { violations } = await mlRuleTest(rule, '<div><Foo><area alt="x" href="#" /></Foo></div>', {
			...jsx,
			pretenders: [{ selector: 'Foo', as: 'Bar' }],
		});
		expect(violations).toStrictEqual([]);
	});

	test('[require-ancestor-issue-4575-017] Svelte: a component outside a declarative shadow root does not count', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<Foo><div><template shadowrootmode="open"><area alt="x" href="#" /></template></div></Foo>',
			svelte,
		);
		expect(violations).toStrictEqual([
			{
				severity: 'error',
				line: 1,
				col: 43,
				message,
				raw: '<area alt="x" href="#" />',
			},
		]);
	});

	test('[require-ancestor-issue-4575-018] a web component is the element that it is written as', async () => {
		const { violations } = await mlRuleTest(rule, '<div><my-el><area alt="x" href="#"></my-el></div>');
		expect(violations).toStrictEqual([
			{
				severity: 'error',
				line: 1,
				col: 13,
				message,
				raw: '<area alt="x" href="#">',
			},
		]);
	});
});
