import { mlRuleTest } from 'markuplint';
import { test, expect, describe } from 'vitest';

import rule from './index.js';

describe('Basic', () => {
	test('An extra column', async () => {
		const { violations } = await mlRuleTest(
			rule,
			`
<table>
  <tr>
    <th></th>
  </tr>
  <tr>
    <td></td>
    <td class="extra"></td>
  </tr>
</table>
`,
		);
		expect(violations).toStrictEqual([
			{
				severity: 'warning',
				line: 8,
				col: 5,
				message: 'One extra column in a row',
				raw: '<td class="extra">',
			},
		]);
	});

	test('Extra columns', async () => {
		const { violations } = await mlRuleTest(
			rule,
			`
<table>
  <tr>
    <th></th>
  </tr>
  <tr>
    <td></td>
    <td class="extra1"></td>
    <td class="extra2"></td>
  </tr>
</table>
`,
		);
		expect(violations).toStrictEqual([
			{
				severity: 'warning',
				line: 8,
				col: 5,
				message: 'Two extra columns in a row',
				raw: '<td class="extra1">',
			},
		]);
	});

	test('A missing column', async () => {
		const { violations } = await mlRuleTest(
			rule,
			`
<table>
  <tr>
    <th></th>
    <th></th>
    <th></th>
  </tr>
  <tr class="missing">
    <td></td>
    <td></td>
  </tr>
  <tr>
    <td></td>
    <td></td>
    <td></td>
  </tr>
</table>
`,
		);
		expect(violations).toStrictEqual([
			{
				severity: 'warning',
				line: 8,
				col: 3,
				message: 'One missing column in a row',
				raw: '<tr class="missing">',
			},
		]);
	});

	test('Missing columns', async () => {
		const { violations } = await mlRuleTest(
			rule,
			`
<table>
  <tr>
    <th></th>
    <th></th>
    <th></th>
    <th></th>
    <th></th>
    <th></th>
    <th></th>
    <th></th>
    <th></th>
    <th></th>
  </tr>
  <tr class="missing">
    <td></td>
  </tr>
</table>
`,
		);
		expect(violations).toStrictEqual([
			{
				severity: 'warning',
				line: 15,
				col: 3,
				message: '9 missing columns in a row',
				raw: '<tr class="missing">',
			},
		]);
	});

	test('Missing columns (with colspan)', async () => {
		const { violations } = await mlRuleTest(
			rule,
			`
<table>
  <tr>
    <th></th>
    <th colspan="3"></th>
    <th></th>
  </tr>
  <tr class="missing">
    <td></td>
  </tr>
</table>
`,
		);
		expect(violations).toStrictEqual([
			{
				severity: 'warning',
				line: 8,
				col: 3,
				message: 'Four missing columns in a row',
				raw: '<tr class="missing">',
			},
		]);
	});
});

describe('Complex', () => {
	test('[rowspan]', async () => {
		const { violations } = await mlRuleTest(
			rule,
			`
<table>
  <tr class="missing1">
    <th></th>
    <th rowspan="3"></th>
    <!-- missing -->
  </tr>
  <tr>
    <td></td>
    <td></td>
  </tr>
  <tr>
    <td></td>
    <td></td>
  </tr>
  <tr class="missing2">
    <td></td>
    <td></td>
    <!-- missing -->
  </tr>
</table>
`,
		);
		expect(violations).toStrictEqual([
			{
				severity: 'warning',
				line: 3,
				col: 3,
				message: 'One missing column in a row',
				raw: '<tr class="missing1">',
			},
			{
				col: 3,
				line: 16,
				message: 'One missing column in a row',
				raw: '<tr class="missing2">',
				severity: 'warning',
			},
		]);
	});

	test('[colspan][rowspan]', async () => {
		const { violations } = await mlRuleTest(
			rule,
			`
<table>
  <tr class="missing">
    <th></th>
    <th colspan="3" rowspan="3"></th>
    <!-- missing -->
  </tr>
  <tr>
    <td></td>
    <td></td>
  </tr>
  <tr>
    <td></td>
    <td></td>
  </tr>
  <tr>
    <td></td>
    <td></td>
    <td></td>
    <td></td>
    <td></td>
  </tr>
</table>
`,
		);
		expect(violations).toStrictEqual([
			{
				severity: 'warning',
				line: 3,
				col: 3,
				message: 'One missing column in a row',
				raw: '<tr class="missing">',
			},
		]);
	});

	test('Overflow', async () => {
		const { violations } = await mlRuleTest(
			rule,
			`
<table>
  <thead class="overflow">
    <tr>
      <th rowspan="3"></th>
      <th></th>
      <th></th>
    </tr>
  </thead>
  <tr>
    <td></td>
    <td colspan="8"></td>
  </tr>
  <tr class="missing1">
    <td></td>
    <td></td>
  </tr>
  <tr>
    <td></td>
    <td></td>
    <td></td>
    <td class="extra1"></td>
    <td class="extra2"></td>
  </tr>
</table>
`,
		);
		expect(violations).toStrictEqual([
			{
				severity: 'warning',
				line: 5,
				col: 11,
				message: 'Exceeds the number of available rows',
				raw: 'rowspan="3"',
			},
			{
				severity: 'warning',
				line: 12,
				col: 9,
				message: 'Exceeds the number of available columns',
				raw: 'colspan="8"',
			},
			{
				severity: 'warning',
				line: 14,
				col: 3,
				message: 'One missing column in a row',
				raw: '<tr class="missing1">',
			},
			{
				severity: 'warning',
				line: 22,
				col: 5,
				message: 'Two extra columns in a row',
				raw: '<td class="extra1">',
			},
		]);
	});

	test('Overlap', async () => {
		const { violations } = await mlRuleTest(
			rule,
			`
<table>
  <tr>
    <td></td>
    <td></td>
    <td rowspan="5"></td>
    <td></td>
    <td></td>
  </tr>
  <tr>
    <td></td>
    <td></td>
    <td></td>
    <td></td>
  </tr>
  <tr>
    <td colspan="5"></td>
  </tr>
  <tr>
    <td></td>
    <td></td>
    <td></td>
    <td></td>
  </tr>
  <tr>
    <td></td>
    <td></td>
    <td></td>
    <td></td>
  </tr>
</table>
`,
		);
		expect(violations).toStrictEqual([
			{
				severity: 'warning',
				line: 2,
				col: 1,
				message: '"rowspan" and "colspan" are causing cell overlap',
				raw: '<table>',
			},
		]);
	});
});
