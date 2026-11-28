import { mlRuleTest } from 'markuplint';
import { describe, expect, test } from 'vitest';

import rule from './index.js';

describe('trees', () => {
	test('[no-broken-fragment-link-001] the target of a link is an id of the document, not one in the content of a template', async () => {
		const { violations } = await mlRuleTest(rule, '<a href="#x"></a><template><div id="x"></div></template>');
		expect(violations).toStrictEqual([]);
	});

	test('[no-broken-fragment-link-002] a link in the content of a template is checked against the ids of the document', async () => {
		const { violations } = await mlRuleTest(rule, '<div id="x"></div><template><a href="#x"></a></template>');
		expect(violations).toStrictEqual([]);
	});

	test('[no-broken-fragment-link-003] a link in the content of a template to a missing id is reported', async () => {
		const { violations } = await mlRuleTest(rule, '<template><a href="#x"></a></template>');
		expect(violations).toStrictEqual([]);
	});
});

test('[no-broken-fragment-link-004] fragment', async () => {
	expect((await mlRuleTest(rule, '<a href="#foo"></a>')).violations).toStrictEqual([]);

	expect((await mlRuleTest(rule, '<a href="#"></a>')).violations).toStrictEqual([]);

	expect((await mlRuleTest(rule, '<a href="#top"></a>')).violations).toStrictEqual([]);

	expect((await mlRuleTest(rule, '<a href="#TOP"></a>')).violations).toStrictEqual([]);

	expect(
		(await mlRuleTest(rule, `<a href="#${encodeURI('あいうえお')}"></a><div id="あいうえお"></div>`)).violations,
	).toStrictEqual([]);

	expect(
		(
			await mlRuleTest(rule, '<><a href="#foo" /><div id="foo" /></>', {
				parser: {
					'.*': '@markuplint/jsx-parser',
				},
			})
		).violations,
	).toStrictEqual([]);

	expect(
		(
			await mlRuleTest(rule, '<><a href="#foo" /><div id={foo} /></>', {
				parser: {
					'.*': '@markuplint/jsx-parser',
				},
			})
		).violations,
	).toStrictEqual([]);

	expect(
		(
			await mlRuleTest(rule, '<><a href="#foo" /><div name="foo" /></>', {
				parser: {
					'.*': '@markuplint/jsx-parser',
				},
			})
		).violations,
	).toStrictEqual([]);

	expect(
		(
			await mlRuleTest(rule, '<><a href="#foo" /><div name={foo} /></>', {
				parser: {
					'.*': '@markuplint/jsx-parser',
				},
			})
		).violations,
	).toStrictEqual([]);

	expect(
		(
			await mlRuleTest(rule, '<><a href="#foo" /><div name="foo" /></>', {
				parser: {
					'.*': '@markuplint/jsx-parser',
				},
				rule: {
					options: {
						fragmentRefersNameAttr: true,
					},
				},
			})
		).violations,
	).toStrictEqual([]);

	expect(
		(
			await mlRuleTest(rule, '<><a href="#foo" /><div name={foo} /></>', {
				parser: {
					'.*': '@markuplint/jsx-parser',
				},
				rule: {
					options: {
						fragmentRefersNameAttr: true,
					},
				},
			})
		).violations,
	).toStrictEqual([]);
});

test('[no-broken-fragment-link-005] a fragment that refers to an ID next to a PHP block is not broken', async () => {
	expect(
		(
			await mlRuleTest(
				rule,
				`
	<main>
		<?php foo() ?>
		<a href="#foo">link</a>
		<div id="foo"></div>
	</main>`,
				{
					parser: {
						'.*': '@markuplint/php-parser',
					},
				},
			)
		).violations,
	).toStrictEqual([]);
});

test('[no-broken-fragment-link-006] a fragment is compared with the ID after its percent-encoding and its character references are decoded', async () => {
	expect(
		(
			await mlRuleTest(
				rule,
				`
						<a href="#apple%3Aorange">apple:orange</a>
						<p id="apple:orange">apple:orange</p>

						<a href="#apple%26orange">apple&amp;orange</a>
						<p id="apple&amp;orange">apple&amp;orange</p>

						<a href="#apple%26lemon">apple&amp;lemon</a>
						<p id="apple&lemon">apple&amp;lemon</p>
					`,
				{
					parser: {
						'.*': '@markuplint/php-parser',
					},
				},
			)
		).violations,
	).toStrictEqual([]);
});

test('[no-broken-fragment-link-007] the id that is a literal is the id the element has, a character reference of it is not decoded', async () => {
	const { violations } = await mlRuleTest(rule, '<><div id={"a&amp;b"}></div><a href={"#a&amp;b"}></a></>', {
		parser: { '.*': '@markuplint/jsx-parser' },
	});
	expect(violations).toStrictEqual([]);
});

test('[no-broken-fragment-link-008] an id that the framework does not output is not an id', async () => {
	const { violations } = await mlRuleTest(rule, '<><div id={null}></div><a href="#x"></a></>', {
		parser: { '.*': '@markuplint/jsx-parser' },
	});
	expect(violations).toStrictEqual([]);
});

test('[no-broken-fragment-link-009] a file that is a part of a page may be completed by a file that has the target', async () => {
	const page = '<!doctype html><html><head><title>t</title></head><body><a href="#main">a</a></body></html>';
	expect((await mlRuleTest(rule, page)).violations).toStrictEqual([
		{ severity: 'warning', line: 1, col: 66, message: 'Missing "main" ID', raw: '#main' },
	]);
	expect((await mlRuleTest(rule, '<a href="#main">a</a>')).violations).toStrictEqual([]);
});
