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

	test('User reported case - table with rowspan and colspan', async () => {
		const { violations } = await mlRuleTest(
			rule,
			`
<table aria-label="テーブルのテストです">
  <tr>
      <th rowspan="2">縦2行分</th>
      <th colspan="2">横2列分</th>
  </tr>
  <tr>
      <th>1</th>
      <th>2</th>
  </tr>
</table>
`,
		);
		expect(violations).toStrictEqual([]);
	});
});

describe('Edge Cases', () => {
	test('Empty table', async () => {
		const { violations } = await mlRuleTest(
			rule,
			`
<table>
</table>
`,
		);
		expect(violations).toStrictEqual([]);
	});

	test('Table with thead/tbody/tfoot sections', async () => {
		const { violations } = await mlRuleTest(
			rule,
			`
<table>
  <thead>
    <tr>
      <th>Header 1</th>
      <th>Header 2</th>
      <th>Header 3</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>Data 1</td>
      <td>Data 2</td>
      <td>Data 3</td>
    </tr>
  </tbody>
  <tfoot>
    <tr>
      <td>Footer 1</td>
      <td>Footer 2</td>
      <td>Footer 3</td>
    </tr>
  </tfoot>
</table>
`,
		);
		expect(violations).toStrictEqual([]);
	});

	test('Table sections with mismatched columns', async () => {
		const { violations } = await mlRuleTest(
			rule,
			`
<table>
  <thead>
    <tr>
      <th>Header 1</th>
      <th>Header 2</th>
      <th>Header 3</th>
    </tr>
  </thead>
  <tbody>
    <tr class="missing">
      <td>Data 1</td>
      <td>Data 2</td>
    </tr>
  </tbody>
</table>
`,
		);
		expect(violations).toStrictEqual([
			{
				severity: 'warning',
				line: 11,
				col: 5,
				message: 'One missing column in a row',
				raw: '<tr class="missing">',
			},
		]);
	});

	test('Complex nested rowspan/colspan without overlap', async () => {
		const { violations } = await mlRuleTest(
			rule,
			`
<table>
  <tr>
    <td rowspan="2">A</td>
    <td colspan="2">B</td>
    <td rowspan="3">C</td>
  </tr>
  <tr>
    <td>D</td>
    <td>E</td>
  </tr>
  <tr>
    <td colspan="3">F</td>
  </tr>
</table>
`,
		);
		expect(violations).toStrictEqual([]);
	});

	test('Colspan only table', async () => {
		const { violations } = await mlRuleTest(
			rule,
			`
<table>
  <tr>
    <td colspan="3">Header</td>
  </tr>
  <tr>
    <td>A</td>
    <td>B</td>
    <td>C</td>
  </tr>
</table>
`,
		);
		expect(violations).toStrictEqual([]);
	});

	test('Rowspan only table - valid structure', async () => {
		const { violations } = await mlRuleTest(
			rule,
			`
<table>
  <tr>
    <td rowspan="2">A</td>
    <td>B</td>
    <td>C</td>
  </tr>
  <tr>
    <td>D</td>
    <td>E</td>
  </tr>
</table>
`,
		);
		expect(violations).toStrictEqual([]);
	});

	test('Rowspan only table - invalid structure', async () => {
		const { violations } = await mlRuleTest(
			rule,
			`
<table>
  <tr>
    <td rowspan="3">A</td>
    <td>B</td>
    <td>C</td>
  </tr>
  <tr>
    <td>D</td>
    <td>E</td>
  </tr>
  <tr>
    <td>F</td>
    <td>G</td>
  </tr>
</table>
`,
		);
		expect(violations).toStrictEqual([
			{
				severity: 'warning',
				line: 6,
				col: 5,
				message: 'One extra column in a row',
				raw: '<td>',
			},
		]);
	});

	test('Explicit default values (rowspan=1, colspan=1)', async () => {
		const { violations } = await mlRuleTest(
			rule,
			`
<table>
  <tr>
    <td rowspan="1" colspan="1">A</td>
    <td>B</td>
  </tr>
  <tr>
    <td>C</td>
    <td>D</td>
  </tr>
</table>
`,
		);
		expect(violations).toStrictEqual([]);
	});

	test('Large table with consistent structure', async () => {
		const { violations } = await mlRuleTest(
			rule,
			`
<table>
  <tr>
    <td>1</td>
    <td>2</td>
    <td>3</td>
    <td>4</td>
  </tr>
  <tr>
    <td>5</td>
    <td>6</td>
    <td>7</td>
    <td>8</td>
  </tr>
  <tr>
    <td>9</td>
    <td>10</td>
    <td>11</td>
    <td>12</td>
  </tr>
  <tr>
    <td>13</td>
    <td>14</td>
    <td>15</td>
    <td>16</td>
  </tr>
  <tr>
    <td>17</td>
    <td>18</td>
    <td>19</td>
    <td>20</td>
  </tr>
</table>
`,
		);
		expect(violations).toStrictEqual([]);
	});

	test('Table with tbody rowspan/colspan combinations', async () => {
		const { violations } = await mlRuleTest(
			rule,
			`
<table>
  <thead>
    <tr>
      <th>Header 1</th>
      <th>Header 2</th>
      <th>Header 3</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td rowspan="2">Data A</td>
      <td colspan="2">Data B</td>
    </tr>
    <tr>
      <td>Data C</td>
      <td>Data D</td>
    </tr>
  </tbody>
</table>
`,
		);
		expect(violations).toStrictEqual([]);
	});

	test('Mixed valid and invalid rows', async () => {
		const { violations } = await mlRuleTest(
			rule,
			`
<table>
  <tr>
    <td>A</td>
    <td>B</td>
    <td>C</td>
  </tr>
  <tr>
    <td rowspan="2">D</td>
    <td colspan="2">E</td>
  </tr>
  <tr>
    <td>F</td>
    <td>G</td>
  </tr>
  <tr class="extra">
    <td>H</td>
    <td>I</td>
    <td>J</td>
    <td>K</td>
  </tr>
</table>
`,
		);
		expect(violations).toStrictEqual([
			{
				severity: 'warning',
				line: 20,
				col: 5,
				message: 'One extra column in a row',
				raw: '<td>',
			},
		]);
	});

	test('Single cell table', async () => {
		const { violations } = await mlRuleTest(
			rule,
			`
<table>
  <tr>
    <td>Single cell</td>
  </tr>
</table>
`,
		);
		expect(violations).toStrictEqual([]);
	});

	test('Single row with colspan', async () => {
		const { violations } = await mlRuleTest(
			rule,
			`
<table>
  <tr>
    <td colspan="5">Wide cell</td>
  </tr>
</table>
`,
		);
		expect(violations).toStrictEqual([]);
	});
});
