---
description: 定義された行と列の数に一貫性を確保します。
---

# `table-row-column-alignment`

<!-- textlint-disable ja-technical-writing/ja-no-mixed-period -->

定義された行と列の数に一貫性を確保します。

- 指定された数よりも不一致で少ないか多い行または列について警告します
- 配置を維持するために、`colspan`および`rowspan`属性の計算を含みます
- 不正なスパン設定により重なっているセルに対して警告します

<!-- prettier-ignore-end -->

❌ 間違ったコード例

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
```

✅ 正しいコード例

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
  </tr>
</table>
```

<!-- textlint-enable ja-technical-writing/ja-no-mixed-period -->
