import { mlRuleTest } from 'markuplint';
import { test, expect, describe } from 'vitest';

import rule from './index.js';

describe('Basic', () => {
	test('[no-table-cell-overlap-invalid-001] Overlap', async () => {
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
				severity: 'error',
				line: 2,
				col: 1,
				message: '"rowspan" and "colspan" are causing cell overlap',
				raw: '<table>',
			},
		]);
	});

	test('[no-table-cell-overlap-invalid-002] Overlap suppresses the other checks of the same table', async () => {
		const { violations } = await mlRuleTest(
			rule,
			`
<table>
<tr>
  <td></td>
  <td rowspan="3"></td>
  <td rowspan="3">cell1</td>
</tr>
<tr>
  <td colspan="2"></td>
  <td rowspan="2">cell0</td>
</tr>
</table>
`,
		);
		expect(violations).toStrictEqual([
			{
				severity: 'error',
				line: 2,
				col: 1,
				message: '"rowspan" and "colspan" are causing cell overlap',
				raw: '<table>',
			},
		]);
	});
});

describe('Valid', () => {
	test('[no-table-cell-overlap-valid-001] User reported case - table with rowspan and colspan', async () => {
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

	test('[no-table-cell-overlap-valid-002] Empty table', async () => {
		const { violations } = await mlRuleTest(
			rule,
			`
<table>
</table>
`,
		);
		expect(violations).toStrictEqual([]);
	});

	test('[no-table-cell-overlap-valid-003] Complex nested rowspan/colspan without overlap', async () => {
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

	test('[no-table-cell-overlap-valid-004] Rowspan only table - valid structure', async () => {
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

	test('[no-table-cell-overlap-valid-005] Table with tbody rowspan/colspan combinations', async () => {
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
});
