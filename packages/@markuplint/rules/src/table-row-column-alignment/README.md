---
id: table-row-column-alignment
description: Checks for consistency in the defined number of rows and columns.
---

# `table-row-column-alignment`

Ensures consistency in the defined number of rows and columns.

- Issues warnings for rows or columns that are inconsistently fewer or greater in number than specified
- Includes calculations for `colspan` and `rowspan` attributes to maintain alignment
- Alerts for cells that overlap due to incorrect span settings
- Alerts for rows and columns that no cell begins in, including columns declared by `<col>` and `<colgroup>`
- Alerts for cells whose `rowspan` reaches past the end of their `<thead>`, `<tbody>`, or `<tfoot>`

<!-- prettier-ignore-end -->

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
    <th colspan="3"></th>
    <th></th>
  </tr>
  <tr class="missing">
    <td></td>
  </tr>
</table>

<table>
  <tr class="missing1">
    <th></th>
    <th rowspan="3"></th>
    <!-- missing -->
  </tr>
  <tr>
    <td></td>
    <!-- rowspan area -->
    <td></td>
  </tr>
  <tr>
    <td></td>
    <!-- rowspan area -->
    <td></td>
  </tr>
  <tr class="missing2">
    <td></td>
    <td></td>
    <!-- missing -->
  </tr>
</table>

<table summary="has overlapped cells">
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

<!-- The `colspan` starts next to the `rowspan`, so no cell begins in the third column -->
<table>
  <tr>
    <td rowspan="2"></td>
    <td></td>
  </tr>
  <tr>
    <td colspan="2"></td>
  </tr>
</table>

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

<!-- The `rowspan` reaches past the end of the row group -->
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

<table>
  <tr>
    <th></th>
    <th colspan="3"></th>
    <th></th>
  </tr>
  <tr>
    <td></td>
    <td></td>
    <td></td>
    <td></td>
    <td></td>
  </tr>
</table>

<table>
  <tr>
    <th></th>
    <th rowspan="3"></th>
    <th></th>
  </tr>
  <tr>
    <td></td>
    <!-- rowspan area -->
    <td></td>
  </tr>
  <tr>
    <td></td>
    <!-- rowspan area -->
    <td></td>
  </tr>
  <tr>
    <td></td>
    <td></td>
    <td></td>
  </tr>
</table>
```
