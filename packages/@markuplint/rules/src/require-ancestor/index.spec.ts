import { mlRuleTest } from 'markuplint';
import { describe, expect, test } from 'vitest';

import rule from './index.js';

test('[require-ancestor-001] area outside map is invalid', async () => {
	const { violations } = await mlRuleTest(rule, '<div><area alt="x" href="#"></div>');
	expect(violations).toStrictEqual([
		expect.objectContaining({
			severity: 'error',
			message: 'The "area" element must appear as a descendant of the "map" element',
		}),
	]);
});

test('[require-ancestor-002] area inside map is valid', async () => {
	const { violations } = await mlRuleTest(rule, '<map name="m"><area alt="x" href="#"></map>');
	expect(violations).toStrictEqual([]);
});

test('[require-ancestor-003] area inside deeply nested map has no descendantOf violation', async () => {
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

	test('[require-ancestor-004] area at the top of a partial is not reported', async () => {
		const { violations } = await mlRuleTest(rule, '<area alt="x" href="#">');
		expect(violations).toStrictEqual([]);
	});

	test('[require-ancestor-005] area at the top of a partial after another element is not reported', async () => {
		const { violations } = await mlRuleTest(rule, '<p>a</p><area alt="x" href="#">');
		expect(violations).toStrictEqual([]);
	});

	test('[require-ancestor-006] area in the body of a whole document is reported', async () => {
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

	test('[require-ancestor-007] JSX: area at the top of a component is not reported', async () => {
		const { violations } = await mlRuleTest(rule, '<area alt="x" href="#" />', jsx);
		expect(violations).toStrictEqual([]);
	});

	test('[require-ancestor-008] JSX: area in a fragment at the top of a component is not reported', async () => {
		const { violations } = await mlRuleTest(rule, '<><area alt="x" href="#" /></>', jsx);
		expect(violations).toStrictEqual([]);
	});

	test('[require-ancestor-009] JSX: area in an expression in a fragment at the top of a component is not reported', async () => {
		const { violations } = await mlRuleTest(rule, '<>{xs.map(() => <area alt="x" href="#" />)}</>', jsx);
		expect(violations).toStrictEqual([]);
	});

	test('[require-ancestor-010] JSX: area in an expression in an element is reported', async () => {
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

	test('[require-ancestor-011] JSX: area in a fragment in an element is reported', async () => {
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

	test('[require-ancestor-012] Vue: area at the top of the template of a component is not reported', async () => {
		const { violations } = await mlRuleTest(rule, '<template><area alt="x" href="#" /></template>', vue);
		expect(violations).toStrictEqual([]);
	});

	test('[require-ancestor-013] Vue: area in a template with a directive at the top of a component is not reported', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<template><template v-if="a"><area alt="x" href="#" /></template></template>',
			vue,
		);
		expect(violations).toStrictEqual([]);
	});

	test('[require-ancestor-014] Svelte: area in a block at the top of a component is not reported', async () => {
		const { violations } = await mlRuleTest(rule, '{#if a}<area alt="x" href="#" />{/if}', svelte);
		expect(violations).toStrictEqual([]);
	});

	test('[require-ancestor-015] Svelte: area in a block in an element is reported', async () => {
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

	test('[require-ancestor-016] Pug: area in a block at the top of a file is not reported', async () => {
		const { violations } = await mlRuleTest(rule, 'if a\n  area(alt="x" href="#")', pug);
		expect(violations).toStrictEqual([]);
	});

	test('[require-ancestor-017] Pug: area in a block in an element is reported', async () => {
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

	test('[require-ancestor-018] JSX: area in nested fragments at the top of a component is not reported', async () => {
		const { violations } = await mlRuleTest(rule, '<><><area alt="x" href="#" /></></>', jsx);
		expect(violations).toStrictEqual([]);
	});

	test('[require-ancestor-019] JSX: area in nested fragments in an element is reported', async () => {
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

	test('[require-ancestor-020] JSX: area in a fragment in a map is valid', async () => {
		const { violations } = await mlRuleTest(rule, '<map name="m"><><area alt="x" href="#" /></></map>', jsx);
		expect(violations).toStrictEqual([]);
	});

	test('[require-ancestor-021] JSX: area in an expression in a map is valid', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<map name="m">{xs.map(() => <area alt="x" href="#" />)}</map>',
			jsx,
		);
		expect(violations).toStrictEqual([]);
	});

	test('[require-ancestor-022] Vue: area in nested templates with a directive at the top of a component is not reported', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<template><template v-if="a"><template v-for="b in c"><area alt="x" href="#" /></template></template></template>',
			vue,
		);
		expect(violations).toStrictEqual([]);
	});

	test('[require-ancestor-023] Astro: area at the top of a component is not reported', async () => {
		const { violations } = await mlRuleTest(rule, '<area alt="x" href="#" />', astro);
		expect(violations).toStrictEqual([]);
	});

	test('[require-ancestor-024] Astro: area in an element is reported', async () => {
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

	test('[require-ancestor-025] EJS: area between the tags of a block at the top of a partial is not reported', async () => {
		const { violations } = await mlRuleTest(rule, '<% if (a) { %><area alt="x" href="#"><% } %>', ejs);
		expect(violations).toStrictEqual([]);
	});

	test('[require-ancestor-026] EJS: area between the tags of a block in an element is reported', async () => {
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

	test('[require-ancestor-027] area in a body element without a doctype is reported', async () => {
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
	test('[require-ancestor-028] JSX: area in React.Fragment at the top of a component is not reported', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<React.Fragment><area alt="x" href="#" /></React.Fragment>',
			jsx,
		);
		expect(violations).toStrictEqual([]);
	});

	test('[require-ancestor-029] JSX: area in Fragment at the top of a component is not reported', async () => {
		const { violations } = await mlRuleTest(rule, '<Fragment><area alt="x" href="#" /></Fragment>', jsx);
		expect(violations).toStrictEqual([]);
	});

	test('[require-ancestor-030] JSX: area in React.Fragment in an element is reported', async () => {
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

	test('[require-ancestor-031] Astro: area in Fragment at the top of a component is not reported', async () => {
		const { violations } = await mlRuleTest(rule, '<Fragment><area alt="x" href="#" /></Fragment>', astro);
		expect(violations).toStrictEqual([]);
	});

	test('[require-ancestor-032] Astro: area in slot at the top of a component is not reported', async () => {
		const { violations } = await mlRuleTest(rule, '<slot><area alt="x" href="#" /></slot>', astro);
		expect(violations).toStrictEqual([]);
	});

	test('[require-ancestor-033] Vue: area in slot at the top of the template of a component is not reported', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<template><slot><area alt="x" href="#" /></slot></template>',
			vue,
		);
		expect(violations).toStrictEqual([]);
	});

	test('[require-ancestor-034] Vue: area in slot in an element is reported', async () => {
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
	test('[require-ancestor-035] JSX: area in a template element with a spread attribute at the top of a component is reported', async () => {
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

	test('[require-ancestor-036] an area element in the SVG namespace is not the HTML area element', async () => {
		const { violations } = await mlRuleTest(rule, '<div><svg><area /></svg></div>');
		expect(violations).toStrictEqual([]);
	});
});

describe('the ancestor is looked for in the tree of the element', () => {
	test('[require-ancestor-037] area in the content of a template under a map is not reported', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<map name="m"><template><area alt="x" href="#"></template></map>',
		);
		expect(violations).toStrictEqual([]);
	});

	test('[require-ancestor-038] area in the content of a template is not reported without a map outside', async () => {
		const { violations } = await mlRuleTest(rule, '<div><template><area alt="x" href="#"></template></div>');
		expect(violations).toStrictEqual([]);
	});

	test('[require-ancestor-039] area under a map in the content of a template is valid', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<template><map name="m"><area alt="x" href="#"></map></template>',
		);
		expect(violations).toStrictEqual([]);
	});

	test('[require-ancestor-040] area in the content of a template without a map in the content is not reported', async () => {
		const { violations } = await mlRuleTest(rule, '<template><div><area alt="x" href="#"></div></template>');
		expect(violations).toStrictEqual([]);
	});

	test('[require-ancestor-041] area in a declarative shadow root without a map in it is reported', async () => {
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

	test('[require-ancestor-042] area in a declarative shadow root under a map outside is reported', async () => {
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

	test('[require-ancestor-043] area in a declarative shadow root with a map in it is valid', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<div><template shadowrootmode="open"><map name="m"><area alt="x" href="#"></map></template></div>',
		);
		expect(violations).toStrictEqual([]);
	});

	test('[require-ancestor-044] area in a template that fails to attach a shadow root is not reported', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<ul><template shadowrootmode="open"><area alt="x" href="#"></template></ul>',
		);
		expect(violations).toStrictEqual([]);
	});

	test('[require-ancestor-045] area in a template in a declarative shadow root is not reported', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<div><template shadowrootmode="open"><template><area alt="x" href="#"></template></template></div>',
		);
		expect(violations).toStrictEqual([]);
	});

	test('[require-ancestor-046] a template of a template engine is an ordinary element of the climb', async () => {
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

	test('[require-ancestor-047] JSX: area directly under a component is not reported', async () => {
		const { violations } = await mlRuleTest(rule, '<Foo><area alt="x" href="#" /></Foo>', jsx);
		expect(violations).toStrictEqual([]);
	});

	test('[require-ancestor-048] Vue: area directly under a component is not reported', async () => {
		const { violations } = await mlRuleTest(rule, '<template><Foo><area alt="x" href="#" /></Foo></template>', vue);
		expect(violations).toStrictEqual([]);
	});

	test('[require-ancestor-049] JSX: area under a component that a pretender says is a map is not reported', async () => {
		const { violations } = await mlRuleTest(rule, '<Foo><area alt="x" href="#" /></Foo>', {
			...jsx,
			pretenders: [{ selector: 'Foo', as: 'map' }],
		});
		expect(violations).toStrictEqual([]);
	});

	test('[require-ancestor-050] JSX: area under a component that a pretender says is a div is reported', async () => {
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

	test('[require-ancestor-051] JSX: area under known elements below a component is not reported', async () => {
		const { violations } = await mlRuleTest(rule, '<div><Foo><p><area alt="x" href="#" /></p></Foo></div>', jsx);
		expect(violations).toStrictEqual([]);
	});

	test('[require-ancestor-052] JSX: area in an attribute of a component is not reported', async () => {
		const { violations } = await mlRuleTest(rule, '<div><Foo render={<area alt="x" href="#" />} /></div>', jsx);
		expect(violations).toStrictEqual([]);
	});

	test('[require-ancestor-053] JSX: area under known elements only is reported', async () => {
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

	test('[require-ancestor-054] JSX: area under a component in a map is valid', async () => {
		const { violations } = await mlRuleTest(rule, '<map name="m"><Foo><area alt="x" href="#" /></Foo></map>', jsx);
		expect(violations).toStrictEqual([]);
	});

	test('[require-ancestor-055] Vue: area under the component element is not reported', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<template><div><component :is="x"><area alt="x" href="#" /></component></div></template>',
			vue,
		);
		expect(violations).toStrictEqual([]);
	});

	test('[require-ancestor-056] Vue: area under a slot in an element is still reported', async () => {
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

	test('[require-ancestor-057] Svelte: area under a component is not reported', async () => {
		const { violations } = await mlRuleTest(rule, '<div><Foo><area alt="x" href="#" /></Foo></div>', svelte);
		expect(violations).toStrictEqual([]);
	});

	test('[require-ancestor-058] Astro: area under a component is not reported', async () => {
		const { violations } = await mlRuleTest(rule, '<div><Foo><area alt="x" href="#" /></Foo></div>', astro);
		expect(violations).toStrictEqual([]);
	});

	test('[require-ancestor-059] JSX: area in a fragment under a component is not reported', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<Foo><React.Fragment><area alt="x" href="#" /></React.Fragment></Foo>',
			jsx,
		);
		expect(violations).toStrictEqual([]);
	});

	test('[require-ancestor-060] Vue: area in a template with a directive under a component is not reported', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<template><Foo><template v-if="a"><area alt="x" href="#" /></template></Foo></template>',
			vue,
		);
		expect(violations).toStrictEqual([]);
	});

	test('[require-ancestor-061] Vue: area under a built-in component is not reported', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<template><div><Transition><area alt="x" href="#" /></Transition></div></template>',
			vue,
		);
		expect(violations).toStrictEqual([]);
	});

	test('[require-ancestor-062] JSX: area under a component that a pretender says is another component is not reported', async () => {
		const { violations } = await mlRuleTest(rule, '<div><Foo><area alt="x" href="#" /></Foo></div>', {
			...jsx,
			pretenders: [{ selector: 'Foo', as: 'Bar' }],
		});
		expect(violations).toStrictEqual([]);
	});

	test('[require-ancestor-063] Svelte: a component outside a declarative shadow root does not count', async () => {
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

	test('[require-ancestor-064] a web component is the element that it is written as', async () => {
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

test('[require-ancestor-065] the message is in Japanese with locale ja', async () => {
	const { violations } = await mlRuleTest(rule, '<div><area alt="x" href="#"></div>', undefined, false, 'ja');

	expect(violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 6,
			message: '要素「area」は要素「map」の子孫に出現するべきです',
			raw: '<area alt="x" href="#">',
		},
	]);
});

describe('issue-4744', () => {
	/**
	 * Vue renders a `<template>` that has `v-if`, `v-else-if`, `v-else`, `v-for` or `v-slot` away, and leaves
	 * the one that has any other directive (`v-show`, `:id`) a `template` element: it is what the area at the
	 * top of a component has above it.
	 */
	const vue = {
		parser: { '.*': '@markuplint/vue-parser' },
		specs: { '.*': '@markuplint/vue-spec' },
	};
	const vueWithoutSpec = { parser: vue.parser };

	describe.each([
		['with @markuplint/vue-spec', vue],
		['without @markuplint/vue-spec', vueWithoutSpec],
	])('Vue %s', (_, config) => {
		test.each([
			['v-if', '<template v-if="a">'],
			['v-else', '<template v-else>'],
			['v-for', '<template v-for="b in c">'],
			['v-slot', '<template #item>'],
		])(
			'[require-ancestor-066] area in a template of %s at the top of a component is not reported',
			async (_, open) => {
				const { violations } = await mlRuleTest(
					rule,
					`<template>${open}<area alt="x" href="#" /></template></template>`,
					config,
				);
				expect(violations).toStrictEqual([]);
			},
		);

		test.each([
			['v-show', '<template v-show="a">', 32],
			['a bound attribute', '<template :id="a">', 29],
			['no directive', '<template>', 21],
		])('[require-ancestor-067] area in a template with %s is below a template element', async (_, open, col) => {
			const { violations } = await mlRuleTest(
				rule,
				`<template>${open}<area alt="x" href="#" /></template></template>`,
				config,
			);
			expect(violations).toStrictEqual([
				{
					severity: 'error',
					line: 1,
					col,
					message: 'The "area" element must appear as a descendant of the "map" element',
					raw: '<area alt="x" href="#" />',
				},
			]);
		});
	});
});
