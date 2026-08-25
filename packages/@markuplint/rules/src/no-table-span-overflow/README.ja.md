---
id: no-table-span-overflow
description: セルのrowspanが行グループの末尾を越えている場合に警告します。
---

# `no-table-span-overflow`

`<th>`/`<td>`の`rowspan`が、それが属する`<thead>`、`<tbody>`、`<tfoot>`の最後の行を越えて伸びている場合に警告します。[HTML Living Standard §4.9.12](https://html.spec.whatwg.org/multipage/tables.html#forming-a-table)は「セルは2つ以上の行グループにまたがるスロットを覆うことはできない」と定めており、*ending a row group*アルゴリズムがそのようなセルを行グループの境界で切り詰めます — これはテーブルモデルエラーです。

旧`table-row-column-alignment`ルールから、[`no-table-cell-overlap`](/docs/rules/no-table-cell-overlap)、[`no-empty-table-track`](/docs/rules/no-empty-table-track)、[`consistent-table-row-length`](/docs/rules/consistent-table-row-length)とともに分割されました。`no-table-cell-overlap`が既に報告しているテーブルに対しては、行グループの導出が信頼できなくなるため、このルールは何も報告しません。

❌ 間違ったコード例

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

✅ 正しいコード例

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
