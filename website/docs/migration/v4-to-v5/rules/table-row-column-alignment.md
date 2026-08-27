---
sidebar_position: 6
title: table-row-column-alignment
---

# `table-row-column-alignment` Rule Changes

This page covers the split of the `table-row-column-alignment` rule, a severity escalation, three new reports, and one removed false positive. If you enable the `a11y` preset or this rule directly, read on.

## Summary

| Change                                                                                                | Who is affected                                                 |
| ----------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| Rule split into four                                                                                  | Every config using `table-row-column-alignment`                 |
| Three of the four escalate from `warning` to `error`                                                  | Teams with a zero-warnings CI gate                              |
| Reports columns and rows that no cell begins in, and a `rowspan` reaching past the end of a row group | Anyone linting tables that use `colspan`, `rowspan`, or `<col>` |
| No longer reports an extra column when a `rowspan` exactly fills the rows below it                    | Anyone who worked around the former false positive              |

## Rule split into four

The rule bundled one spec-permitted style check with three table model errors. In v5 each is its own rule:

| New rule                      | What it checks                                                | Default severity |
| ----------------------------- | ------------------------------------------------------------- | ---------------- |
| `no-table-cell-overlap`       | Two cells anchored so they cover the same slot (Step 14)      | `error`          |
| `no-table-span-overflow`      | A `rowspan` reaching past the end of its row group            | `error`          |
| `no-empty-table-track`        | A row or column that no cell is anchored to (Step 20)         | `error`          |
| `consistent-table-row-length` | A row whose column count disagrees with the rest of the table | `warning`        |

```json
{
  "rules": {
    "no-table-cell-overlap": true,
    "no-table-span-overflow": true,
    "no-empty-table-track": true,
    "consistent-table-row-length": true
  }
}
```

:::tip
`table-row-column-alignment` keeps working. Markuplint reports a deprecation warning and expands your config to all four rules automatically, until the old name is removed in v6. The full split list is in [Renames and Splits](/docs/migration/v4-to-v5/rules/rule-names).
:::

:::caution Severity escalation can turn a green pipeline red
In v4 the whole rule was `warning`. The three table model errors are now `error`, because HTML LS forbids authors from producing them — a MUST. Only `consistent-table-row-length` stays `warning`: HTML LS §4.9.12.1 Step 7 grows the table to fit a wider row, so a ragged table is a likely mistake rather than a conformance violation.

If your build uses a strict gate such as `--max-warnings 0`, check your current warning counts on these rules before upgrading.
:::

Once a table has a cell overlap, the grid the other three derive from it is speculative, so `no-table-span-overflow`, `no-empty-table-track`, and `consistent-table-row-length` report nothing on a table `no-table-cell-overlap` already reports on.

## What changed

In v4 the rule counted the cells of each row. In v5 it builds the slot grid of [HTML LS §4.9.12.1 _Forming a table_](https://html.spec.whatwg.org/multipage/tables.html#forming-a-table), which is the model the table model errors are defined against. The row-consistency reports (`One extra column in a row`, `One missing column in a row`) are unchanged in substance and now live in `consistent-table-row-length`; the grid adds three checks and removes one false positive.

### Newly reported: a column that no cell begins in

Reported by `no-empty-table-track`.

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

The same step covers rows, so a `<tr>` without cells is reported, also by `no-empty-table-track`:

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

A cell cannot cover slots from two or more row groups, so a `rowspan` longer than the rows remaining in its `<thead>`, `<tbody>`, or `<tfoot>` is reported on the attribute by `no-table-span-overflow`:

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

These three are `error` in v5, so a table model error that was only a warning in v4 now fails a build that treats errors as fatal. To keep v4 behaviour, either downgrade the severity:

```json
{
  "rules": {
    "no-table-cell-overlap": { "severity": "warning" },
    "no-table-span-overflow": { "severity": "warning" },
    "no-empty-table-track": { "severity": "warning" }
  }
}
```

or disable the checks entirely:

```json
{
  "rules": {
    "no-table-cell-overlap": false,
    "no-table-span-overflow": false,
    "no-empty-table-track": false,
    "consistent-table-row-length": false
  }
}
```
