---
id: no-table-cell-overlap
description: テーブル内で2つのセルが同じスロットを覆うように配置されている場合に警告します。
---

# `no-table-cell-overlap`

`<table>`の`rowspan`/`colspan`属性によって2つのセルが同じスロットを覆うように配置されている場合に警告します。これは[HTML Living Standard §4.9.12.1 _Forming a table_ Step 14](https://html.spec.whatwg.org/multipage/tables.html#forming-a-table)が定めるテーブルモデルエラーです。

旧`table-row-column-alignment`ルールから、[`no-table-span-overflow`](/docs/rules/no-table-span-overflow)、[`no-empty-table-track`](/docs/rules/no-empty-table-track)、[`consistent-table-row-length`](/docs/rules/consistent-table-row-length)とともに分割されました。テーブルにセルの重複があると、この3つの姉妹ルールが導出するグリッドは信頼できなくなるため、このルールが報告するテーブルに対してはこの3つは何も報告しません。

❌ 間違ったコード例

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

✅ 正しいコード例

```html
<table>
  <tr>
    <th rowspan="2">縦に結合</th>
    <th colspan="2">横に結合</th>
  </tr>
  <tr>
    <th>1</th>
    <th>2</th>
  </tr>
</table>
```
