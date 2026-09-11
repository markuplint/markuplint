---
id: no-table-span-overflow
description: Warns when a cell's rowspan reaches past the end of its row group.
---

# `no-table-span-overflow`

Warns when a `<th>` / `<td>`'s `rowspan` reaches past the last row of its `<thead>`, `<tbody>`, or `<tfoot>`. [HTML Living Standard §4.9.12](https://html.spec.whatwg.org/multipage/tables.html#forming-a-table) states "a cell cannot cover slots that are from two or more row groups", so the _ending a row group_ algorithm clips such a cell to its group — a table model error.

Split out of the former `table-row-column-alignment` rule, alongside [`no-table-cell-overlap`](/docs/rules/no-table-cell-overlap), [`no-empty-table-track`](/docs/rules/no-empty-table-track), and [`consistent-table-row-length`](/docs/rules/consistent-table-row-length). This rule reports nothing on a table `no-table-cell-overlap` already reports on, since the row groups an overlapping table derives are no longer reliable.

❌ Examples of **incorrect** code for this rule

```html
<table>
  <tbody>
    <tr>
      <td rowspan="3">Spanning cell</td>
    </tr>
    <tr>
      <td>Cell</td>
    </tr>
  </tbody>
</table>
```

✅ Examples of **correct** code for this rule

```html
<table>
  <tbody>
    <tr>
      <td rowspan="2">Spanning cell</td>
    </tr>
    <tr>
      <td>Cell</td>
    </tr>
  </tbody>
</table>
```
