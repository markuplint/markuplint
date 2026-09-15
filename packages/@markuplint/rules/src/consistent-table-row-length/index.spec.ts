import { mlRuleTest } from 'markuplint';
import { test, expect, describe } from 'vitest';

import rule from './index.js';

describe('Basic', () => {
	test('[consistent-table-row-length-invalid-001] An extra column', async () => {
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

	test('[consistent-table-row-length-invalid-002] Extra columns', async () => {
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

	test('[consistent-table-row-length-invalid-003] A missing column', async () => {
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

	test('[consistent-table-row-length-invalid-004] Missing columns', async () => {
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

	test('[consistent-table-row-length-invalid-005] Missing columns (with colspan)', async () => {
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
	test('[consistent-table-row-length-invalid-006] [rowspan]', async () => {
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

	test('[consistent-table-row-length-invalid-007] [colspan][rowspan]', async () => {
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

	test('[consistent-table-row-length-invalid-008] Overflow', async () => {
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
});

describe('Edge Cases', () => {
	test('[consistent-table-row-length-valid-001] Empty table', async () => {
		const { violations } = await mlRuleTest(
			rule,
			`
<table>
</table>
`,
		);
		expect(violations).toStrictEqual([]);
	});

	test('[consistent-table-row-length-valid-002] Table with thead/tbody/tfoot sections', async () => {
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

	test('[consistent-table-row-length-invalid-009] Table sections with mismatched columns', async () => {
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

	test('[consistent-table-row-length-valid-003] Complex nested rowspan/colspan without overlap', async () => {
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

	test('[consistent-table-row-length-valid-004] Colspan only table', async () => {
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

	test('[consistent-table-row-length-valid-005] Rowspan only table - valid structure', async () => {
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

	test('[consistent-table-row-length-valid-006] Rowspan only table - invalid structure', async () => {
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
		// BREAKING CHANGE (#3915): the table is conforming. HTML LS §4.9.12.1 Step 6 anchors each
		// cell of the second and third rows past the slot the `rowspan` still occupies, so every
		// row is three slots wide and every column has a cell anchored to it. The former report
		// was a false positive of the pre-#3915 grid model, which counted cells instead of slots.
		// https://html.spec.whatwg.org/multipage/tables.html#forming-a-table
		expect(violations).toStrictEqual([]);
	});

	test('[consistent-table-row-length-valid-007] Explicit default values (rowspan=1, colspan=1)', async () => {
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

	test('[consistent-table-row-length-valid-008] Large table with consistent structure', async () => {
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

	test('[consistent-table-row-length-valid-009] Table with tbody rowspan/colspan combinations', async () => {
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

	test('[consistent-table-row-length-invalid-010] Mixed valid and invalid rows', async () => {
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

	test('[consistent-table-row-length-valid-010] Single cell table', async () => {
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

	test('[consistent-table-row-length-valid-011] Single row with colspan', async () => {
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
		// A single-row table always compares a row against its own width, so a `colspan` can
		// never disagree with the (self-derived) base column count. `no-empty-table-track`
		// reports the real table model error here (Step 20 — the four columns to the right of
		// the anchor have no cell anchored to them).
		expect(violations).toStrictEqual([]);
	});
});

describe('Table model errors', () => {
	test('[consistent-table-row-length-invalid-011] Colspan anchored past a rowspan continuation', async () => {
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
				severity: 'warning',
				line: 8,
				col: 9,
				message: 'Exceeds the number of available columns',
				raw: 'colspan="2"',
			},
		]);
	});

	test('[consistent-table-row-length-invalid-012] Rowspan reaching past the end of its row group', async () => {
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
				severity: 'warning',
				line: 5,
				col: 9,
				message: 'One extra column in a row',
				raw: '<td>',
			},
		]);
	});

	test('[consistent-table-row-length-valid-012] Overlap suppresses the other checks of the same table', async () => {
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

	test('[consistent-table-row-length-valid-013] Row wider than the column markup', async () => {
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
		// HTML LS §4.9.12.1 Step 7 grows xwidth to fit the row, so exceeding the column markup is
		// not a table model error. nu-validator disagrees; that report is recorded as an
		// over-detection in `tests/external/snapshots/excluded-ids.json` (Issue #3916). A
		// single-row table also always compares a row against its own width (see valid-011),
		// so this could never fire here regardless.
		expect(violations).toStrictEqual([]);
	});
});
