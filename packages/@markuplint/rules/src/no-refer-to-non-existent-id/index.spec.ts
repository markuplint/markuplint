import { mlRuleTest } from 'markuplint';
import { describe, test, expect } from 'vitest';

import rule from './index.js';

test('label[for]', async () => {
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

test('td[headers]', async () => {
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

test('td[headers] (Dynamic)', async () => {
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

test('td[headers] (Dynamic)', async () => {
	const { violations } = await mlRuleTest(
		rule,
		// cspell: disable
		`<table>
  <tr>
    <th id="a"></th>
    <th id="b"></th>
    <td headers={aandb}></td>
  </tr>
</table>`,
		// cspell: enable
		{
			parser: {
				'.*': '@markuplint/jsx-parser',
			},
		},
	);
	expect(violations.length).toBe(0);
});

test('aria-describedby', async () => {
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

test('fragment', async () => {
	expect((await mlRuleTest(rule, '<a href="#foo"></a>')).violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 10,
			raw: '#foo',
			message: 'Missing "foo" ID',
		},
	]);

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
	).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 12,
			raw: '#foo',
			message: 'Missing "foo" ID',
		},
	]);

	expect(
		(
			await mlRuleTest(rule, '<><a href="#foo" /><div name={foo} /></>', {
				parser: {
					'.*': '@markuplint/jsx-parser',
				},
			})
		).violations,
	).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 12,
			raw: '#foo',
			message: 'Missing "foo" ID',
		},
	]);

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

test('The `as` attribute', async () => {
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

describe('Issues', () => {
	test('#748', async () => {
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

	test('#776', async () => {
		expect(
			(
				await mlRuleTest(
					rule,
					/* cSpell:disable */
					`
						<a href="#apple%3Aorange">apple:orange</a>
						<p id="apple:orange">apple:orange</p>

						<a href="#apple%26orange">apple&amp;orange</a>
						<p id="apple&amp;orange">apple&amp;orange</p>

						<a href="#apple%26lemon">apple&amp;lemon</a>
						<p id="apple&lemon">apple&amp;lemon</p>
					`,
					/* cSpell:enable */
					{
						parser: {
							'.*': '@markuplint/php-parser',
						},
					},
				)
			).violations,
		).toStrictEqual([]);
	});

	test('#1611', async () => {
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
});
