---
id: consistent-table-row-length
description: 行の列数がテーブルの他の行と一致しない場合に警告します。
---

# `consistent-table-row-length`

`<table>`の行の列数が、テーブルの基準となる列数と一致しない場合(不足=列が足りない、過剰=列が多い)に警告します。`colspan`/`rowspan`による計算を含みます。

旧`table-row-column-alignment`ルールの姉妹分割ルールである[`no-table-cell-overlap`](/docs/rules/no-table-cell-overlap)、[`no-table-span-overflow`](/docs/rules/no-table-span-overflow)、[`no-empty-table-track`](/docs/rules/no-empty-table-track)とは異なり、これはテーブルモデルエラーではありません。[HTML Living Standard §4.9.12.1 _Forming a table_ Step 7](https://html.spec.whatwg.org/multipage/tables.html#forming-a-table)は、より広い行に合わせてテーブルを拡張するため、列が多いことはエラーになりません。列が少ない場合も、`no-empty-table-track`が既に検出するケース(セルがひとつも開始しない列)以外はテーブルモデルエラーではありません。それでも不揃いなテーブルはほとんどの場合誤りであるため、このチェックは存在し、デフォルトの深刻度も姉妹ルールの`error`ではなく`warning`のままです。`no-table-cell-overlap`が既に報告しているテーブルに対しては、行の幅の導出が信頼できなくなるため、このルールは何も報告しません。

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
    <th></th>
    <th></th>
  </tr>
  <tr>
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
```
