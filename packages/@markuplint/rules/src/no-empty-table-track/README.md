---
id: no-empty-table-track
description: Warns when a table row or column has no cell anchored to it.
---

# `no-empty-table-track`

Warns when a `<table>` has a row or a column that no cell is anchored to — a table model error under [HTML Living Standard §4.9.12.1 _Forming a table_, Step 20](https://html.spec.whatwg.org/multipage/tables.html#forming-a-table): "if a column or a row does not have at least one cell anchored to it, that also constitutes a table model error." A column can be established either by a `<tr>`'s cells or by `<col>` / `<colgroup>` markup; either way, a column no cell ever starts in is reported.

Split out of the former `table-row-column-alignment` rule, alongside [`no-table-cell-overlap`](/docs/rules/no-table-cell-overlap), [`no-table-span-overflow`](/docs/rules/no-table-span-overflow), and [`consistent-table-row-length`](/docs/rules/consistent-table-row-length). This rule reports nothing on a table `no-table-cell-overlap` already reports on, since the anchors an overlapping table derives are no longer reliable.

❌ Examples of **incorrect** code for this rule

```html
<!-- No cell begins in the third column declared by column markup -->
<table>
  <colgroup>
    <col />
    <col />
    <col />
  </colgroup>
  <tr>
    <td></td>
    <td></td>
  </tr>
</table>

<!-- No cell begins in the second row -->
<table>
  <tr>
    <td></td>
  </tr>
  <tr></tr>
</table>
```

✅ Examples of **correct** code for this rule

```html
<table>
  <colgroup>
    <col />
    <col />
  </colgroup>
  <tr>
    <td></td>
    <td></td>
  </tr>
</table>
```
