import { mlRuleTest } from 'markuplint';
import { describe, expect, test } from 'vitest';

import rule from './index.js';

test('[no-refer-to-non-existent-id-001] label[for]', async () => {
	const { violations } = await mlRuleTest(rule, '<label for="foo"></label>');
	expect(violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 13,
			raw: 'foo',
			message: 'Missing "foo" ID',
		},
	]);
});

test('[no-refer-to-non-existent-id-002] td[headers]', async () => {
	const { violations } = await mlRuleTest(
		rule,
		`<table>
  <tr>
    <th id="a"></th>
    <th id="b"></th>
    <td headers="a c"></td>
  </tr>
</table>`,
		{
			parser: {
				'.*': '@markuplint/jsx-parser',
			},
		},
	);
	expect(violations).toStrictEqual([
		{
			severity: 'error',
			line: 5,
			col: 18,
			raw: 'a c',
			message: 'Missing "c" ID',
		},
	]);
});

test('[no-refer-to-non-existent-id-003] td[headers] (Dynamic)', async () => {
	const { violations } = await mlRuleTest(
		rule,
		`<table>
  <tr>
    <th id={a}></th>
    <th id={b}></th>
    <td headers="a c"></td>
  </tr>
</table>`,
		{
			parser: {
				'.*': '@markuplint/jsx-parser',
			},
		},
	);
	expect(violations.length).toBe(0);
});

test('[no-refer-to-non-existent-id-004] td[headers] (Dynamic)', async () => {
	const { violations } = await mlRuleTest(
		rule,
		`<table>
  <tr>
    <th id="a"></th>
    <th id="b"></th>
    <td headers={aandb}></td>
  </tr>
</table>`,
		{
			parser: {
				'.*': '@markuplint/jsx-parser',
			},
		},
	);
	expect(violations.length).toBe(0);
});

test('[no-refer-to-non-existent-id-005] aria-describedby', async () => {
	const { violations } = await mlRuleTest(rule, '<section aria-describedby="foo"></section>');
	expect(violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 28,
			raw: 'foo',
			message: 'Missing "foo" ID',
		},
	]);
});

test('[no-refer-to-non-existent-id-006] The `as` attribute', async () => {
	const { violations } = await mlRuleTest(rule, '<x-label as="label" for="foo"></x-label>');
	expect(violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 26,
			raw: 'foo',
			message: 'Missing "foo" ID',
		},
	]);
});

test('[no-refer-to-non-existent-id-007] the for attribute of an output refers to more than one ID, all of which must exist', async () => {
	expect(
		(
			await mlRuleTest(
				rule,
				`
<p><label>1 <input id="1" /></label> + <label>2 <input id="2" /></label></p>
<p><output for="1 2"></output></p>`,
			)
		).violations,
	).toStrictEqual([]);

	expect(
		(
			await mlRuleTest(
				rule,
				`
<p><label>1 <input id="1" /></label> + <label>2 <input id="2" /></label></p>
<p><output for="1 2 3"></output></p>`,
			)
		).violations,
	).toStrictEqual([
		{
			severity: 'error',
			line: 3,
			col: 17,
			message: 'Missing "3" ID',
			raw: '1 2 3',
		},
	]);
});

test('[no-refer-to-non-existent-id-008] an upper-case name is the attribute in HTML', async () => {
	const { violations } = await mlRuleTest(rule, '<label FOR="foo"></label>');
	expect(violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 13,
			raw: 'foo',
			message: 'Missing "foo" ID',
		},
	]);
});

test('[no-refer-to-non-existent-id-009] an upper-case ARIA property is the property in HTML', async () => {
	const { violations } = await mlRuleTest(rule, '<div ARIA-LABELLEDBY="foo"></div>');
	expect(violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 23,
			raw: 'foo',
			message: 'Missing "foo" ID',
		},
	]);
});

test('[no-refer-to-non-existent-id-010] an upper-case id is the id', async () => {
	const found = await mlRuleTest(rule, '<div ID="foo"></div><label for="foo"></label>');
	expect(found.violations).toStrictEqual([]);
	const missing = await mlRuleTest(rule, '<div ID="foo"></div><label for="bar"></label>');
	expect(missing.violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 33,
			raw: 'bar',
			message: 'Missing "bar" ID',
		},
	]);
});

test('[no-refer-to-non-existent-id-011] an HTML element in JSX folds the name', async () => {
	const options = { parser: { '.*': '@markuplint/jsx-parser' } };
	const upper = await mlRuleTest(rule, '<label FOR="foo" />', options);
	expect(upper.violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 13,
			raw: 'foo',
			message: 'Missing "foo" ID',
		},
	]);
	const lower = await mlRuleTest(rule, '<label for="foo" />', options);
	expect(lower.violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 13,
			raw: 'foo',
			message: 'Missing "foo" ID',
		},
	]);
});

describe('an id is resolved in the tree of the reference', () => {
	test('[no-refer-to-non-existent-id-012] a reference in a template reaches an id in the same template', async () => {
		const { violations } = await mlRuleTest(rule, '<template><input id="a"><label for="a"></label></template>');
		expect(violations).toStrictEqual([]);
	});

	test('[no-refer-to-non-existent-id-013] a reference in a template does not reach an id of the document', async () => {
		const { violations } = await mlRuleTest(rule, '<input id="a"><template><label for="a"></label></template>');
		expect(violations).toStrictEqual([
			{
				severity: 'error',
				line: 1,
				col: 37,
				raw: 'a',
				message: 'Missing "a" ID',
			},
		]);
	});

	test('[no-refer-to-non-existent-id-014] a reference of the document does not reach an id in a template', async () => {
		const { violations } = await mlRuleTest(rule, '<label for="a"></label><template><input id="a"></template>');
		expect(violations).toStrictEqual([
			{
				severity: 'error',
				line: 1,
				col: 13,
				raw: 'a',
				message: 'Missing "a" ID',
			},
		]);
	});

	test('[no-refer-to-non-existent-id-015] a reference in a declarative shadow root reaches an id in it', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<div><template shadowrootmode="open"><input id="a"><label for="a"></label></template></div>',
		);
		expect(violations).toStrictEqual([]);
	});

	test('[no-refer-to-non-existent-id-016] the reference is compared after the character references are resolved', async () => {
		const { violations } = await mlRuleTest(rule, '<input id="a"><label for="&#97;"></label>');
		expect(violations).toStrictEqual([]);
	});

	test('[no-refer-to-non-existent-id-017] a dynamic id in another tree does not hide a missing id', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<label for="a"></label><template><input id="{{x}}"></template>',
			{ parser: { '.*': '@markuplint/mustache-parser' } },
		);
		expect(violations).toStrictEqual([
			{
				severity: 'error',
				line: 1,
				col: 13,
				raw: 'a',
				message: 'Missing "a" ID',
			},
		]);
	});

	test('[no-refer-to-non-existent-id-018] a reference on a template that is in no tree is not reported', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<div><template shadowrootmode="open" aria-labelledby="a"></template></div>',
		);
		expect(violations).toStrictEqual([]);
	});

	test('[no-refer-to-non-existent-id-019] a dynamic id in the same tree may be what the reference means', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<template><label for="a"></label><input id="{{x}}"></template>',
			{ parser: { '.*': '@markuplint/mustache-parser' } },
		);
		expect(violations).toStrictEqual([]);
	});
});

test('[no-refer-to-non-existent-id-020] the id that is a literal is the id the element has, a character reference of it is not decoded', async () => {
	const { violations } = await mlRuleTest(rule, '<><input id={"a&amp;b"} /><label htmlFor={"a&amp;b"}></label></>', {
		parser: { '.*': '@markuplint/jsx-parser' },
		specs: { '.*': '@markuplint/react-spec' },
	});
	expect(violations).toStrictEqual([]);
});

test('[no-refer-to-non-existent-id-021] an id that the framework does not output is not an id, nor an id that may be anything', async () => {
	const { violations } = await mlRuleTest(rule, '<><div id={null}></div><label htmlFor="x"></label></>', {
		parser: { '.*': '@markuplint/jsx-parser' },
		specs: { '.*': '@markuplint/react-spec' },
	});
	expect(violations).toStrictEqual([{ severity: 'error', line: 1, col: 40, message: 'Missing "x" ID', raw: 'x' }]);
});

test('[no-refer-to-non-existent-id-022] an id of code that is not a literal may be any', async () => {
	const { violations } = await mlRuleTest(rule, '<><div id={cond}></div><label htmlFor="x"></label></>', {
		parser: { '.*': '@markuplint/jsx-parser' },
		specs: { '.*': '@markuplint/react-spec' },
	});
	expect(violations).toStrictEqual([]);
});

/**
 * An element with spread attributes, a component that no pretender resolved and content that is not known
 * may be the element that a reference refers to.
 */
describe('an id that the markup does not tell', () => {
	const jsx = { '.*': '@markuplint/jsx-parser' };
	const dyn = { selector: 'Dyn', as: { element: 'div', contents: [{ dynamic: true as const }] } };

	test('[no-refer-to-non-existent-id-023] an element with spread attributes, a component that is not resolved and a pretender with unknown contents may have the id', async () => {
		const { violations } = await mlRuleTest(
			rule,
			`<>
	<h2 {...props}>spread</h2>
	<Header />
	<Dyn />
	<div aria-labelledby="spread-id">a</div>
	<div aria-labelledby="in-component">b</div>
	<div aria-labelledby="in-dyn">c</div>
</>`,
			{
				parser: jsx,
				pretenders: [dyn],
			},
		);
		expect(violations).toStrictEqual([]);
	});

	test.each([
		['a spread', '<><h2 {...props}>t</h2><label for="a" /></>'],
		['a spread after the id', '<><h2 id="x" {...props}>t</h2><label for="a" /></>'],
		['an id that code gives after a static one', '<><h2 id="x" id={y}>t</h2><label for="a" /></>'],
		['a component', '<><Header /><label for="a" /></>'],
		['a pretender with unknown contents', '<><Dyn /><label for="a" /></>'],
		['a block of children', '<><div>{children}</div><label for="a" /></>'],
		['a conditional block', '<><label for="a" />{cond && <i />}</>'],
	])('[no-refer-to-non-existent-id-024] %s suppresses the report alone', async (_, code) => {
		const { violations } = await mlRuleTest(rule, code, { parser: jsx, pretenders: [dyn] });
		expect(violations).toStrictEqual([]);
	});

	test('[no-refer-to-non-existent-id-025] a spread before the id is overridden by it, so the id is known', async () => {
		const { violations } = await mlRuleTest(rule, '<><h2 {...props} id="a">t</h2><label for="b" /></>', {
			parser: jsx,
		});
		expect(violations).toStrictEqual([
			{
				severity: 'error',
				line: 1,
				col: 43,
				raw: 'b',
				message: 'Missing "b" ID',
			},
		]);
	});

	test('[no-refer-to-non-existent-id-026] a pretender whose contents are declared stays decidable', async () => {
		const { violations } = await mlRuleTest(rule, '<><Known /><label for="a" /></>', {
			parser: jsx,
			pretenders: [{ selector: 'Known', as: { element: 'div', contents: [{ element: 'span' }] } }],
		});
		expect(violations).toStrictEqual([
			{
				severity: 'error',
				line: 1,
				col: 24,
				raw: 'a',
				message: 'Missing "a" ID',
			},
		]);
	});

	test('[no-refer-to-non-existent-id-027] a dynamic attribute other than the id does not bring an id', async () => {
		const { violations } = await mlRuleTest(rule, '<><h2 className={x}>t</h2><label for="a" /></>', {
			parser: jsx,
		});
		expect(violations).toStrictEqual([
			{
				severity: 'error',
				line: 1,
				col: 39,
				raw: 'a',
				message: 'Missing "a" ID',
			},
		]);
	});

	test('[no-refer-to-non-existent-id-028] content that a block with a behavior shows is known', async () => {
		const { violations } = await mlRuleTest(rule, '<><label for="a" />{items.map(i => <li key={i}>a</li>)}</>', {
			parser: jsx,
		});
		expect(violations).toStrictEqual([
			{
				severity: 'error',
				line: 1,
				col: 15,
				raw: 'a',
				message: 'Missing "a" ID',
			},
		]);
	});

	test('[no-refer-to-non-existent-id-029] a document with a block of a template language that has no behavior is not reported', async () => {
		const { violations } = await mlRuleTest(rule, '<label for="a"></label><%= content %>', {
			parser: { '.*': '@markuplint/ejs-parser' },
		});
		expect(violations).toStrictEqual([]);
	});

	test.each([
		['ejs', '<label for="a"></label><%- include(\'nav\') %>', '@markuplint/ejs-parser'],
		['php', '<label for="a"></label><?php include "nav.php"; ?>', '@markuplint/php-parser'],
		['nunjucks', '<label for="a"></label>{% include \'nav.html\' %}', '@markuplint/nunjucks-parser'],
		['liquid', '<label for="a"></label>{% render \'nav\' %}', '@markuplint/liquid-parser'],
	])(
		'[no-refer-to-non-existent-id-030] an include of %s is a block that has no behavior, so its content is not known',
		async (_, source, parser) => {
			const { violations } = await mlRuleTest(rule, source, { parser: { '.*': parser } });
			expect(violations).toStrictEqual([]);
		},
	);

	test.each([
		['Svelte {#if}', '<label for="zz"></label>{#if a}<p>x</p>{/if}', '@markuplint/svelte-parser'],
		['Svelte {#each}', '<label for="zz"></label>{#each xs as x}<p>a</p>{/each}', '@markuplint/svelte-parser'],
		[
			'Alpine x-for',
			'<label for="zz"></label><template x-for="x in xs"><p>a</p></template>',
			'@markuplint/alpine-parser',
		],
	])(
		'[no-refer-to-non-existent-id-031] %s is a block with a behavior, whose content is in the tree',
		async (_, source, parser) => {
			const { violations } = await mlRuleTest(rule, source, { parser: { '.*': parser } });
			expect(violations).toStrictEqual([
				{
					severity: 'error',
					line: 1,
					col: 13,
					raw: 'zz',
					message: 'Missing "zz" ID',
				},
			]);
		},
	);

	test('[no-refer-to-non-existent-id-032] Pug each is a block with a behavior, whose content is in the tree', async () => {
		const { violations } = await mlRuleTest(rule, 'label(for="zz")\neach x in xs\n  p a', {
			parser: { '.*': '@markuplint/pug-parser' },
		});
		expect(violations).toStrictEqual([
			{
				severity: 'error',
				line: 1,
				col: 11,
				raw: '"zz"',
				message: 'Missing "zz" ID',
			},
		]);
	});

	test.each([
		['a spread (v-bind="obj")', '<template><h2 v-bind="obj">t</h2><label for="zz"></label></template>'],
		['a component', '<template><Foo /><label for="zz"></label></template>'],
		[
			'a component in a template that has a directive',
			'<template><template v-if="a"><Foo /></template><label for="zz"></label></template>',
		],
		['a slot', '<template><slot /><label for="zz"></label></template>'],
	])('[no-refer-to-non-existent-id-033] Vue: %s may bring the id', async (_, source) => {
		const { violations } = await mlRuleTest(rule, source, {
			parser: { '.*': '@markuplint/vue-parser' },
			specs: { '.*': '@markuplint/vue-spec' },
		});
		expect(violations).toStrictEqual([]);
	});

	test.each([
		['Vue v-html', '<template><p v-html="h"></p><label for="zz"></label></template>', 'vue'],
		['Alpine x-html', '<p x-html="h"></p><label for="zz"></label>', 'alpine'],
		[
			'React dangerouslySetInnerHTML',
			'<><p dangerouslySetInnerHTML={{ __html: h }} /><label for="zz" /></>',
			'react',
		],
	])(
		'[no-refer-to-non-existent-id-034] %s replaces the children with markup that the template does not show',
		async (_, source, name) => {
			const { violations } = await mlRuleTest(rule, source, {
				parser: { '.*': name === 'react' ? '@markuplint/jsx-parser' : `@markuplint/${name}-parser` },
				specs: { '.*': `@markuplint/${name}-spec` },
			});
			expect(violations).toStrictEqual([]);
		},
	);

	test.each(['<h2 x-bind="o">t</h2>', '<h2 x-bind="o" id="a">t</h2>', '<h2 id="a" x-bind="o">t</h2>'])(
		'[no-refer-to-non-existent-id-035] Alpine: the object of x-bind may bring the id wherever it is written: %s',
		async h2 => {
			const { violations } = await mlRuleTest(rule, `${h2}<label for="zz"></label>`, {
				parser: { '.*': '@markuplint/alpine-parser' },
				specs: { '.*': '@markuplint/alpine-spec' },
			});
			expect(violations).toStrictEqual([]);
		},
	);

	test('[no-refer-to-non-existent-id-036] v-text does not hold markup, so the reference is reported', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<template><p v-text="h"></p><label for="zz"></label></template>',
			{
				parser: { '.*': '@markuplint/vue-parser' },
				specs: { '.*': '@markuplint/vue-spec' },
			},
		);
		expect(violations.map(v => v.message)).toStrictEqual(['Missing "zz" ID']);
	});

	test.each(['transition', 'keep-alive', 'Teleport', 'Suspense'])(
		'[no-refer-to-non-existent-id-037] Vue: the built-in component %s holds what is written in it',
		async name => {
			const { violations } = await mlRuleTest(
				rule,
				`<template><${name}><p>a</p></${name}><label for="zz"></label></template>`,
				{
					parser: { '.*': '@markuplint/vue-parser' },
					specs: { '.*': '@markuplint/vue-spec' },
				},
			);
			expect(violations.map(v => v.message)).toStrictEqual(['Missing "zz" ID']);
		},
	);

	test('[no-refer-to-non-existent-id-038] Vue: a template that has a directive and elements of HTML only brings no id', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<template><template v-if="a"><p>x</p></template><label for="zz"></label></template>',
			{
				parser: { '.*': '@markuplint/vue-parser' },
				specs: { '.*': '@markuplint/vue-spec' },
			},
		);
		expect(violations).toStrictEqual([
			{
				severity: 'error',
				line: 1,
				col: 61,
				raw: 'zz',
				message: 'Missing "zz" ID',
			},
		]);
	});
});

/**
 * What a pretender declares (the slot wrappers and the static entries of `contents`) is rendered by the
 * component, so a reference may refer to its id.
 */
describe('an element that a pretender declares', () => {
	const jsx = { '.*': '@markuplint/jsx-parser' };
	const idOf = (id: string | { readonly dynamic: true }) => [{ name: 'id', value: id }];
	const heading = (element: Record<string, unknown>) => ({
		selector: 'Heading',
		as: { element: 'div', ...element },
	});
	const missing = (raw: string, col: number) => ({
		severity: 'error',
		line: 1,
		col,
		raw,
		message: `Missing "${raw}" ID`,
	});

	test('[no-refer-to-non-existent-id-039] the id of an element in `contents` is resolved', async () => {
		const { violations } = await mlRuleTest(rule, '<><Heading>Q</Heading><label for="t" /></>', {
			parser: jsx,
			pretenders: [heading({ contents: [{ element: 'h2', attrs: idOf('t') }, { slot: true }] })],
		});
		expect(violations).toStrictEqual([]);
	});

	test('[no-refer-to-non-existent-id-040] an id that no declared element has is still reported', async () => {
		const { violations } = await mlRuleTest(rule, '<><Heading>Q</Heading><label for="u" /></>', {
			parser: jsx,
			pretenders: [heading({ contents: [{ element: 'h2', attrs: idOf('t') }, { slot: true }] })],
		});
		expect(violations).toStrictEqual([missing('u', 35)]);
	});

	test('[no-refer-to-non-existent-id-041] the id of an element that comes after the children given at the usage site is resolved', async () => {
		const { violations } = await mlRuleTest(rule, '<><Heading>Q</Heading><label for="t" /></>', {
			parser: jsx,
			pretenders: [heading({ contents: [{ slot: true }, { element: 'h2', attrs: idOf('t') }] })],
		});
		expect(violations).toStrictEqual([]);
	});

	test('[no-refer-to-non-existent-id-042] the id of the element that wraps the single slot, and of an element in it, is resolved', async () => {
		const { violations } = await mlRuleTest(rule, '<><Heading>Q</Heading><label for="w" /><label for="t" /></>', {
			parser: jsx,
			pretenders: [
				heading({
					slots: [
						{
							element: 'p',
							attrs: idOf('w'),
							contents: [{ element: 'h2', attrs: idOf('t') }, { slot: true }],
						},
					],
				}),
			],
		});
		expect(violations).toStrictEqual([]);
	});

	test('[no-refer-to-non-existent-id-043] the id of an element of any of several slots is resolved', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<><Heading>Q</Heading><label for="a" /><label for="b" /><label for="c" /><label for="d" /></>',
			{
				parser: jsx,
				pretenders: [
					heading({
						slots: [
							{
								element: 'p',
								attrs: idOf('a'),
								contents: [{ element: 'i', attrs: idOf('b') }, { slot: true }],
							},
							{ element: 'section', attrs: idOf('c'), contents: [{ element: 'b', attrs: idOf('d') }] },
						],
					}),
				],
			},
		);
		expect(violations).toStrictEqual([]);
	});

	test('[no-refer-to-non-existent-id-044] a declared element whose id is not known may be the one that a reference means', async () => {
		const { violations } = await mlRuleTest(rule, '<><Heading>Q</Heading><label for="u" /></>', {
			parser: jsx,
			pretenders: [heading({ contents: [{ element: 'h2', attrs: idOf({ dynamic: true }) }, { slot: true }] })],
		});
		expect(violations).toStrictEqual([]);
	});

	test('[no-refer-to-non-existent-id-045] a declared element is in the tree of the pretended element, not of the document', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<div><template><Heading>Q</Heading></template></div><label for="t"></label>',
			{
				pretenders: [heading({ contents: [{ element: 'h2', attrs: idOf('t') }, { slot: true }] })],
			},
		);
		expect(violations).toStrictEqual([missing('t', 65)]);
		// The pretender applies to `Heading` of this parser: the same markup outside the template resolves
		const outside = await mlRuleTest(rule, '<div><Heading>Q</Heading></div><label for="t"></label>', {
			pretenders: [heading({ contents: [{ element: 'h2', attrs: idOf('t') }, { slot: true }] })],
		});
		expect(outside.violations).toStrictEqual([]);
	});

	test('[no-refer-to-non-existent-id-046] what a declarative shadow root replaces is not rendered, so its id is not resolved', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<x-btn><template shadowrootmode="open"></template></x-btn><label for="t"></label>',
			{
				pretenders: [
					{
						selector: 'x-btn',
						as: { element: 'div', inheritAttrs: true, contents: [{ element: 'h2', attrs: idOf('t') }] },
					},
				],
			},
		);
		expect(violations).toStrictEqual([missing('t', 71)]);
	});
});

describe('an ID reference list is split on ASCII white space only', () => {
	test('[no-refer-to-non-existent-id-047] an id that holds U+00A0 is one token of an ARIA ID reference list', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<span id="a\u00A0b"></span><div aria-describedby="a\u00A0b"></div>',
		);
		expect(violations).toStrictEqual([]);
	});

	test('[no-refer-to-non-existent-id-048] an id that holds U+00A0 is one token of an ID reference list of HTML', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<table><tr><th id="a\u00A0b"></th><td headers="a\u00A0b"></td></tr></table>',
		);
		expect(violations).toStrictEqual([]);
	});

	test('[no-refer-to-non-existent-id-049] a token that holds U+00A0 is reported as one id', async () => {
		const { violations } = await mlRuleTest(rule, '<span id="a"></span><div aria-describedby="a\u00A0b"></div>');
		expect(violations).toStrictEqual([
			{
				severity: 'error',
				line: 1,
				col: 44,
				raw: 'a\u00A0b',
				message: 'Missing "a\u00A0b" ID',
			},
		]);
	});
});

test('[no-refer-to-non-existent-id-050] a character reference of white space separates two ids', async () => {
	expect(
		(await mlRuleTest(rule, '<span id="a"></span><span id="b"></span><div aria-labelledby="a&#32;b"></div>'))
			.violations,
	).toStrictEqual([]);
});

test.each([
	['php', '<div <?= $attrs ?>></div>\n<label for="a"></label>'],
	['ejs', '<div <%= attrs %>></div>\n<label for="a"></label>'],
	['liquid', '<div {{ attrs }}></div>\n<label for="a"></label>'],
	['erb', '<div <%= attrs %>></div>\n<label for="a"></label>'],
	['smarty', '<div {$attrs}></div>\n<label for="a"></label>'],
	['pug', 'div&attributes(attrs)\nlabel(for="a")'],
])(
	'[no-refer-to-non-existent-id-051] a block in a tag, or &attributes of Pug, may give the id: %s',
	async (lang, code) => {
		const { violations } = await mlRuleTest(rule, code, { parser: { '.*': `@markuplint/${lang}-parser` } });
		expect(violations).toStrictEqual([]);
	},
);

test('[no-refer-to-non-existent-id-052] a block in a tag before the id is overridden by it', async () => {
	const { violations } = await mlRuleTest(rule, '<div <?= $attrs ?> id="b"></div>\n<label for="a"></label>', {
		parser: { '.*': '@markuplint/php-parser' },
	});
	expect(violations).toStrictEqual([{ severity: 'error', line: 2, col: 13, message: 'Missing "a" ID', raw: 'a' }]);
});

test('[no-refer-to-non-existent-id-053] Astro: the children that set:html gives may hold the id', async () => {
	const astro = { parser: { '.*': '@markuplint/astro-parser' } };
	expect(
		(await mlRuleTest(rule, '<div set:html={html}></div>\n<label for="a"></label>', astro)).violations,
	).toStrictEqual([]);

	// Control: set:text gives text, not elements
	expect(
		(await mlRuleTest(rule, '<div set:text={text}></div>\n<label for="a"></label>', astro)).violations,
	).toStrictEqual([{ severity: 'error', line: 2, col: 13, message: 'Missing "a" ID', raw: 'a' }]);
});

test('[no-refer-to-non-existent-id-054] Vue: a kebab-case tag may be a component that renders the id', async () => {
	const vue = { parser: { '.*': '@markuplint/vue-parser' }, specs: { '.*': '@markuplint/vue-spec' } };
	expect(
		(await mlRuleTest(rule, '<template><my-comp></my-comp><label for="a"></label></template>', vue)).violations,
	).toStrictEqual([]);

	// Control: a built-in component renders what it is given, and HTML takes the tag for a custom element
	expect(
		(
			await mlRuleTest(
				rule,
				'<template><transition-group></transition-group><label for="a"></label></template>',
				vue,
			)
		).violations,
	).toStrictEqual([{ severity: 'error', line: 1, col: 60, message: 'Missing "a" ID', raw: 'a' }]);
	expect((await mlRuleTest(rule, '<my-comp></my-comp><label for="a"></label>')).violations).toStrictEqual([
		{ severity: 'error', line: 1, col: 32, message: 'Missing "a" ID', raw: 'a' },
	]);
});
