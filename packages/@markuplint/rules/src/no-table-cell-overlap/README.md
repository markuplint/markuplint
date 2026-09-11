---
id: no-table-cell-overlap
description: Warns when two cells anchored in a table are covering the same slot.
---

# `no-table-cell-overlap`

Warns when a `<table>`'s `rowspan` / `colspan` attributes cause two cells to be anchored so that they cover the same slot — a table model error under [HTML Living Standard §4.9.12.1 _Forming a table_, Step 14](https://html.spec.whatwg.org/multipage/tables.html#forming-a-table).

Split out of the former `table-row-column-alignment` rule, alongside [`no-table-span-overflow`](/docs/rules/no-table-span-overflow), [`no-empty-table-track`](/docs/rules/no-empty-table-track), and [`consistent-table-row-length`](/docs/rules/consistent-table-row-length). Once a table has an overlap, the grid those three siblings derive from it is speculative, so they report nothing on a table this rule reports on.

❌ Examples of **incorrect** code for this rule

```html
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
```

✅ Examples of **correct** code for this rule

```html
<table>
  <tr>
    <th rowspan="2">Row span</th>
    <th colspan="2">Col span</th>
  </tr>
  <tr>
    <th>1</th>
    <th>2</th>
  </tr>
</table>
```
