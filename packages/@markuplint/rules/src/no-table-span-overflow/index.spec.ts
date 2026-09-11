import { mlRuleTest } from 'markuplint';
import { test, expect, describe } from 'vitest';

import rule from './index.js';

describe('Basic', () => {
	test('[no-table-span-overflow-invalid-001] Overflow', async () => {
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
				severity: 'error',
				line: 5,
				col: 11,
				message: 'Exceeds the number of available rows',
				raw: 'rowspan="3"',
			},
		]);
	});

	test('[no-table-span-overflow-invalid-002] Rowspan reaching past the end of its row group', async () => {
		const { violations } = await mlRuleTest(
			rule,
			`
<table>
  <tbody>
    <tr><td rowspan="3">Spanning cell</td></tr>
    <tr><td>Cell</td></tr>
  </tbody>
</table>
`,
		);
		expect(violations).toStrictEqual([
			{
				severity: 'error',
				line: 4,
				col: 13,
				message: 'Exceeds the number of available rows',
				raw: 'rowspan="3"',
			},
		]);
	});
});

describe('Valid', () => {
	test('[no-table-span-overflow-valid-001] Empty table', async () => {
		const { violations } = await mlRuleTest(
			rule,
			`
<table>
</table>
`,
		);
		expect(violations).toStrictEqual([]);
	});

	test('[no-table-span-overflow-valid-002] Table with thead/tbody/tfoot sections', async () => {
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

	test('[no-table-span-overflow-valid-003] Rowspan only table - valid structure', async () => {
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

	test('[no-table-span-overflow-valid-004] Table with tbody rowspan/colspan combinations', async () => {
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

	test('[no-table-span-overflow-valid-005] Overlap suppresses the other checks of the same table', async () => {
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
		expect(violations).toStrictEqual([]);
	});
});
