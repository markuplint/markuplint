# `table-row-column-alignment`

v4 default severity was `warning`. v5 splits into four rules. Alias expands to all four until v6.

| New rule | Check | Default severity |
| --- | --- | --- |
| `no-table-cell-overlap` | Overlapping cells | `error` |
| `no-table-span-overflow` | `rowspan` past the row group | `error` |
| `no-empty-table-track` | Row or column with no anchored cell | `error` |
| `consistent-table-row-length` | Uneven column counts (spec allows growing the table) | `warning` |

v5 models the grid with [HTML LS §4.9.12.1 Forming a table](https://html.spec.whatwg.org/multipage/tables.html#forming-a-table). New reports include empty tracks and `rowspan` past a row group. A `rowspan` that exactly fills the rows below it is **no longer** reported as an extra column (v4 cell-counting false positive).

If overlap is reported, the other three rules skip that table (the grid would be speculative).

`markuplint:a11y` enables all four as named groups. Restore v4 warning-level table-model checks by setting those three rules to `"severity": "warning"`.
