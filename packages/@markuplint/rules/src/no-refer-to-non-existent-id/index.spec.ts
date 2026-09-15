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
