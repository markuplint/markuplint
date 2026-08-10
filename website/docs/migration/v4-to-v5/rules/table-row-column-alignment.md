---
sidebar_position: 6
title: table-row-column-alignment
---

# `table-row-column-alignment` Rule Changes

This page covers three new reports and one removed false positive in the `table-row-column-alignment` rule. If you enable the `a11y` preset or this rule directly, read on.

## Summary

| Change                                                                                                | Who is affected                                                 |
| ----------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| Reports columns and rows that no cell begins in, and a `rowspan` reaching past the end of a row group | Anyone linting tables that use `colspan`, `rowspan`, or `<col>` |
| No longer reports an extra column when a `rowspan` exactly fills the rows below it                    | Anyone who worked around the former false positive              |

## What changed

In v4 the rule counted the cells of each row. In v5 it builds the slot grid of [HTML LS §4.9.12.1 _Forming a table_](https://html.spec.whatwg.org/multipage/tables.html#forming-a-table), which is the model the table model errors are defined against. The row-consistency reports (`One extra column in a row`, `One missing column in a row`) are unchanged; the grid adds three checks and removes one false positive.

### Newly reported: a column that no cell begins in

Step 20 of the algorithm makes a column that only holds slots without a cell anchored to them a table model error. A `colspan` that reaches past the last cell, or one that starts next to a `rowspan` continuation, produces such a column:

```html
<!-- Reported in v5: no cell begins in the third column -->
<table>
  <tr>
    <td rowspan="2"></td>
    <td></td>
  </tr>
  <tr>
    <td colspan="2"></td>
  </tr>
</table>
```

Columns declared by `<col>` and `<colgroup>` count too, so column markup that no row ever fills is reported on the `<col>` element:

```html
<!-- Reported in v5: no cell begins in the third column -->
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
```

A row wider than the column markup is **not** reported: Step 7 of the algorithm grows the table to fit the row.

### Newly reported: a row that no cell begins in

The same step covers rows, so a `<tr>` without cells is reported:

```html
<!-- Reported in v5: no cell begins in the second row -->
<table>
  <tr>
    <td></td>
  </tr>
  <tr></tr>
</table>
```

### Newly reported: a `rowspan` reaching past the end of its row group

A cell cannot cover slots from two or more row groups, so a `rowspan` longer than the rows remaining in its `<thead>`, `<tbody>`, or `<tfoot>` is reported on the attribute:

```html
<!-- Reported in v5: the rowspan reaches past the end of the tbody -->
<table>
  <tbody>
    <tr>
      <td rowspan="3"></td>
    </tr>
    <tr>
      <td></td>
    </tr>
  </tbody>
</table>
```

### No longer reported: a `rowspan` that exactly fills the rows below it

Step 6 anchors each cell past the slots a `rowspan` still occupies, so the rows below a `rowspan` are the same width as the first row. v4 counted cells instead and reported an extra column here:

```html
<!-- Reported in v4, conforming in v5 -->
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
```

## How to fix

Every new report is a table model error that HTML LS forbids authors from producing, so fix the markup: shorten the `colspan` or `rowspan`, add the missing cell, or remove the `<col>` that no row fills.

The rule's severity is `warning`, so nothing that was passing your build starts failing it. To keep v4 behaviour, disable the rule:

```json
{
  "rules": {
    "table-row-column-alignment": false
  }
}
```
