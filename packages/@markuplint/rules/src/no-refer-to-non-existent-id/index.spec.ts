import { mlRuleTest } from 'markuplint';

import rule from './';

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
