---
id: no-empty-table-track
description: テーブルの行または列にセルがひとつも開始しない場合に警告します。
---

# `no-empty-table-track`

`<table>`にセルがひとつも開始しない行または列がある場合に警告します。これは[HTML Living Standard §4.9.12.1 _Forming a table_ Step 20](https://html.spec.whatwg.org/multipage/tables.html#forming-a-table)が定めるテーブルモデルエラーです:「列または行にセルがひとつも開始していない場合、それもテーブルモデルエラーとなる」。列は`<tr>`のセルによって、あるいは`<col>`/`<colgroup>`マークアップによって確立されます。どちらの場合も、セルがひとつも開始しない列は報告されます。

旧`table-row-column-alignment`ルールから、[`no-table-cell-overlap`](/docs/rules/no-table-cell-overlap)、[`no-table-span-overflow`](/docs/rules/no-table-span-overflow)、[`consistent-table-row-length`](/docs/rules/consistent-table-row-length)とともに分割されました。`no-table-cell-overlap`が既に報告しているテーブルに対しては、アンカーの導出が信頼できなくなるため、このルールは何も報告しません。

❌ 間違ったコード例

```html
<!-- 列マークアップが宣言した3列目にセルがひとつも開始しません -->
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

<!-- 2行目にセルがひとつも開始しません -->
<table>
  <tr>
    <td></td>
  </tr>
  <tr></tr>
</table>
```

✅ 正しいコード例

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
