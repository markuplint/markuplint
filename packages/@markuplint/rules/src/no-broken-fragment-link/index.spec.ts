import { mlRuleTest } from 'markuplint';
import { describe, test, expect } from 'vitest';

import rule from './index.js';

describe('trees', () => {
	test('[no-broken-fragment-link-issue-4489-001] the target of a link is an id of the document, not one in the content of a template', async () => {
		const { violations } = await mlRuleTest(rule, '<a href="#x"></a><template><div id="x"></div></template>');
		expect(violations).toStrictEqual([
			{
				severity: 'warning',
				line: 1,
				col: 10,
				raw: '#x',
				message: 'Missing "x" ID',
			},
		]);
	});

	test('[no-broken-fragment-link-issue-4489-002] a link in the content of a template is checked against the ids of the document', async () => {
		const { violations } = await mlRuleTest(rule, '<div id="x"></div><template><a href="#x"></a></template>');
		expect(violations).toStrictEqual([]);
	});

	test('[no-broken-fragment-link-issue-4489-003] a link in the content of a template to a missing id is reported', async () => {
		const { violations } = await mlRuleTest(rule, '<template><a href="#x"></a></template>');
		expect(violations).toStrictEqual([
			{
				severity: 'warning',
				line: 1,
				col: 20,
				raw: '#x',
				message: 'Missing "x" ID',
			},
		]);
	});
});

test('[no-broken-fragment-link-invalid-001] fragment', async () => {
	expect((await mlRuleTest(rule, '<a href="#foo"></a>')).violations).toStrictEqual([
		{
			severity: 'warning',
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
			severity: 'warning',
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
			severity: 'warning',
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

describe('Issues', () => {
	test('[no-broken-fragment-link-issue-748] #748', async () => {
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

	test('[no-broken-fragment-link-issue-776] #776', async () => {
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
});
