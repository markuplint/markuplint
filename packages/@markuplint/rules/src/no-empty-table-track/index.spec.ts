import { mlRuleTest } from 'markuplint';
import { test, expect, describe } from 'vitest';

import rule from './index.js';

describe('Basic', () => {
	test('[no-empty-table-track-invalid-001] Missing columns (with colspan)', async () => {
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
		// HTML LS §4.9.12.1 Step 20 — no cell is ever anchored to the two columns the `colspan`
		// stretches the table over, which is a table model error.
		// https://html.spec.whatwg.org/multipage/tables.html#forming-a-table
		expect(violations).toStrictEqual([
			{
				severity: 'error',
				line: 5,
				col: 9,
				message: 'Two columns have no cells beginning in them',
				raw: 'colspan="3"',
			},
		]);
	});

	test('[no-empty-table-track-invalid-002] Overflow', async () => {
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
		// HTML LS §4.9.12.1 Step 20 — the last four columns the `colspan="8"` cell stretches the
		// table over have no cell anchored to them.
		// https://html.spec.whatwg.org/multipage/tables.html#forming-a-table
		expect(violations).toStrictEqual([
			{
				severity: 'error',
				line: 12,
				col: 9,
				message: 'Four columns have no cells beginning in them',
				raw: 'colspan="8"',
			},
		]);
	});
});

describe('Table model errors', () => {
	test('[no-empty-table-track-invalid-003] Colspan anchored past a rowspan continuation', async () => {
		const { violations } = await mlRuleTest(
			rule,
			`
<table>
  <tr>
    <td rowspan="2">Cell 1</td>
    <td>Cell 2</td>
  </tr>
  <tr>
    <td colspan="2">Overlapping cell</td>
  </tr>
</table>
`,
		);
		expect(violations).toStrictEqual([
			{
				severity: 'error',
				line: 8,
				col: 9,
				message: 'One column has no cells beginning in it',
				raw: 'colspan="2"',
			},
		]);
	});

	test('[no-empty-table-track-invalid-004] Colspan reaching past the last anchored column', async () => {
		const { violations } = await mlRuleTest(
			rule,
			`
<table>
  <tr>
    <td>A</td>
    <td colspan="5">B</td>
  </tr>
</table>
`,
		);
		expect(violations).toStrictEqual([
			{
				severity: 'error',
				line: 5,
				col: 9,
				message: 'Four columns have no cells beginning in them',
				raw: 'colspan="5"',
			},
		]);
	});

	test('[no-empty-table-track-invalid-005] Column markup declaring a column no cell starts in', async () => {
		const { violations } = await mlRuleTest(
			rule,
			`
<table>
  <colgroup>
    <col><col><col>
  </colgroup>
  <tr><td>Cell 1</td><td>Cell 2</td></tr>
</table>
`,
		);
		expect(violations).toStrictEqual([
			{
				severity: 'error',
				line: 4,
				col: 15,
				message: 'One column has no cells beginning in it',
				raw: '<col>',
			},
		]);
	});

	test('[no-empty-table-track-invalid-006] Row without cells', async () => {
		const { violations } = await mlRuleTest(
			rule,
			`
<table>
  <tr><td>Cell</td></tr>
  <tr></tr>
</table>
`,
		);
		expect(violations).toStrictEqual([
			{
				severity: 'error',
				line: 4,
				col: 3,
				message: 'One row has no cells beginning in it',
				raw: '<tr>',
			},
		]);
	});

	test('[no-empty-table-track-invalid-007] Single row with colspan', async () => {
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
		// BREAKING CHANGE (#3915): HTML LS §4.9.12.1 Step 20 forbids a column that only holds
		// slots without a cell anchored to them, and the four columns to the right of the anchor
		// never get one. nu-validator reports the same table. The pre-#3915 baseline reported no
		// violation here.
		// https://html.spec.whatwg.org/multipage/tables.html#forming-a-table
		expect(violations).toStrictEqual([
			{
				severity: 'error',
				line: 4,
				col: 9,
				message: 'Four columns have no cells beginning in them',
				raw: 'colspan="5"',
			},
		]);
	});
});

describe('Valid', () => {
	test('[no-empty-table-track-valid-001] Empty table', async () => {
		const { violations } = await mlRuleTest(
			rule,
			`
<table>
</table>
`,
		);
		expect(violations).toStrictEqual([]);
	});

	test('[no-empty-table-track-valid-002] Table with thead/tbody/tfoot sections', async () => {
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

	test('[no-empty-table-track-valid-003] Complex nested rowspan/colspan without overlap', async () => {
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

	test('[no-empty-table-track-valid-004] Colspan only table', async () => {
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

	test('[no-empty-table-track-valid-005] Table with tbody rowspan/colspan combinations', async () => {
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

	test('[no-empty-table-track-valid-006] Row wider than the column markup', async () => {
		const { violations } = await mlRuleTest(
			rule,
			`
<table>
  <colgroup>
    <col><col>
  </colgroup>
  <tr><td>Cell 1</td><td>Cell 2</td><td>Cell 3</td></tr>
</table>
`,
		);
		// HTML LS §4.9.12.1 Step 7 grows xwidth to fit the row, so every column ends up anchored.
		expect(violations).toStrictEqual([]);
	});

	test('[no-empty-table-track-valid-007] Overlap suppresses the other checks of the same table', async () => {
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
