---
id: consistent-table-row-length
description: Warns when a row's number of columns disagrees with the rest of the table.
---

# `consistent-table-row-length`

Warns when a `<table>` row's number of columns is inconsistent with the table's base column count — fewer (a missing column) or more (an extra column), accounting for `colspan` / `rowspan`.

Unlike its sibling splits of the former `table-row-column-alignment` rule — [`no-table-cell-overlap`](/docs/rules/no-table-cell-overlap), [`no-table-span-overflow`](/docs/rules/no-table-span-overflow), and [`no-empty-table-track`](/docs/rules/no-empty-table-track) — this is not a table model error: [HTML Living Standard §4.9.12.1 _Forming a table_, Step 7](https://html.spec.whatwg.org/multipage/tables.html#forming-a-table) grows the table to fit a wider row, and a narrower row is only a table model error where `no-empty-table-track` already catches it (a column no cell ever anchors to). A ragged table is nevertheless almost always a mistake, which is why this check exists and why its default severity stays `warning` rather than the `error` of its siblings. It reports nothing on a table `no-table-cell-overlap` already reports on, since row widths derived from an overlapping table are no longer reliable.

❌ Examples of **incorrect** code for this rule

```html
<table>
  <tr>
    <th></th>
  </tr>
  <tr>
    <td></td>
    <td class="extra"></td>
  </tr>
</table>

<table>
  <tr>
    <th></th>
    <th></th>
    <th></th>
  </tr>
  <tr>
    <td></td>
    <td></td>
  </tr>
</table>
```

✅ Examples of **correct** code for this rule

```html
<table>
  <tr>
    <th></th>
  </tr>
  <tr>
    <td></td>
  </tr>
</table>
```
