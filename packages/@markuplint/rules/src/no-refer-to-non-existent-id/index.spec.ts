import { mlRuleTest } from 'markuplint';
import { describe, test, expect } from 'vitest';

import rule from './index.js';

test('[no-refer-to-non-existent-id-invalid-001] label[for]', async () => {
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

test('[no-refer-to-non-existent-id-invalid-002] td[headers]', async () => {
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

test('[no-refer-to-non-existent-id-valid-001] td[headers] (Dynamic)', async () => {
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

test('[no-refer-to-non-existent-id-valid-002] td[headers] (Dynamic)', async () => {
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

test('[no-refer-to-non-existent-id-invalid-003] aria-describedby', async () => {
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

test('[no-refer-to-non-existent-id-invalid-004] The `as` attribute', async () => {
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
	test('[no-refer-to-non-existent-id-issue-1611] #1611', async () => {
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

test('[no-refer-to-non-existent-id-issue-4309-001] an upper-case name is the attribute in HTML', async () => {
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

test('[no-refer-to-non-existent-id-issue-4309-002] an upper-case ARIA property is the property in HTML', async () => {
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

test('[no-refer-to-non-existent-id-issue-4309-003] an upper-case id is the id', async () => {
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

test('[no-refer-to-non-existent-id-issue-4309-004] an HTML element in JSX folds the name', async () => {
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
