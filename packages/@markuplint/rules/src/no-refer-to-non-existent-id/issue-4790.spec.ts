import { mlRuleTest } from 'markuplint';
import { describe, test, expect } from 'vitest';

import rule from './index.js';

/**
 * An element with spread attributes, a component that no pretender resolved and content that is not known
 * may be the element that a reference refers to.
 */
describe('an id that the markup does not tell', () => {
	const jsx = { '.*': '@markuplint/jsx-parser' };
	const dyn = { selector: 'Dyn', as: { element: 'div', contents: [{ dynamic: true as const }] } };

	test('[no-refer-to-non-existent-id-issue-4790-001] an element with spread attributes, a component that is not resolved and a pretender with unknown contents may have the id', async () => {
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
	])('[no-refer-to-non-existent-id-issue-4790-002] %s suppresses the report alone', async (_, code) => {
		const { violations } = await mlRuleTest(rule, code, { parser: jsx, pretenders: [dyn] });
		expect(violations).toStrictEqual([]);
	});

	test('[no-refer-to-non-existent-id-issue-4790-003] a spread before the id is overridden by it, so the id is known', async () => {
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

	test('[no-refer-to-non-existent-id-issue-4790-004] a pretender whose contents are declared stays decidable', async () => {
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

	test('[no-refer-to-non-existent-id-issue-4790-005] a dynamic attribute other than the id does not bring an id', async () => {
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

	test('[no-refer-to-non-existent-id-issue-4790-006] content that a block with a behavior shows is known', async () => {
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

	test('[no-refer-to-non-existent-id-issue-4790-007] a document with a block of a template language that has no behavior is not reported', async () => {
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
		'[no-refer-to-non-existent-id-issue-4790-008] an include of %s is a block that has no behavior, so its content is not known',
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
		'[no-refer-to-non-existent-id-issue-4790-009] %s is a block with a behavior, whose content is in the tree',
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

	test('[no-refer-to-non-existent-id-issue-4790-009] Pug each is a block with a behavior, whose content is in the tree', async () => {
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
	])('[no-refer-to-non-existent-id-issue-4790-010] Vue: %s may bring the id', async (_, source) => {
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
		'[no-refer-to-non-existent-id-issue-4790-013] %s replaces the children with markup that the template does not show',
		async (_, source, name) => {
			const { violations } = await mlRuleTest(rule, source, {
				parser: { '.*': name === 'react' ? '@markuplint/jsx-parser' : `@markuplint/${name}-parser` },
				specs: { '.*': `@markuplint/${name}-spec` },
			});
			expect(violations).toStrictEqual([]);
		},
	);

	test.each(['<h2 x-bind="o">t</h2>', '<h2 x-bind="o" id="a">t</h2>', '<h2 id="a" x-bind="o">t</h2>'])(
		'[no-refer-to-non-existent-id-issue-4790-015] Alpine: the object of x-bind may bring the id wherever it is written: %s',
		async h2 => {
			const { violations } = await mlRuleTest(rule, `${h2}<label for="zz"></label>`, {
				parser: { '.*': '@markuplint/alpine-parser' },
				specs: { '.*': '@markuplint/alpine-spec' },
			});
			expect(violations).toStrictEqual([]);
		},
	);

	test('[no-refer-to-non-existent-id-issue-4790-014] v-text does not hold markup, so the reference is reported', async () => {
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
		'[no-refer-to-non-existent-id-issue-4790-012] Vue: the built-in component %s holds what is written in it',
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

	test('[no-refer-to-non-existent-id-issue-4790-011] Vue: a template that has a directive and elements of HTML only brings no id', async () => {
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
