---
sidebar_position: 6
title: table-row-column-alignment
---

# `table-row-column-alignment`ルールの変更

このページでは`table-row-column-alignment`ルールに追加された3つの検査と、削除された1つの誤検出について説明します。`a11y`プリセットを使っている場合、またはこのルールを直接有効にしている場合は読んでください。

## 概要

| 変更                                                                                    | 影響を受ける人                                              |
| --------------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| セルがひとつも開始しない列と行、および行グループの末尾を越える`rowspan`を報告するように | `colspan`、`rowspan`、`<col>`を使うテーブルをlintしている人 |
| `rowspan`が下の行をちょうど埋めている場合に余分な列を報告しなくなった                   | 以前の誤検出を回避していた人                                |

## 変更点

v4では行ごとにセルを数えていました。v5では[HTML LS §4.9.12.1 _Forming a table_](https://html.spec.whatwg.org/multipage/tables.html#forming-a-table)のスロットグリッドを構築します。これはテーブルモデルエラーが定義されている土台のモデルです。行の一貫性に関する報告（`One extra column in a row`、`One missing column in a row`）は変わりません。グリッド化によって3つの検査が加わり、1つの誤検出がなくなります。

### 新規報告: セルがひとつも開始しない列

アルゴリズムのStep 20は、セルがアンカーされていないスロットだけで構成される列をテーブルモデルエラーとしています。最後のセルより先まで伸びる`colspan`や、`rowspan`の継続スロットの隣から始まる`colspan`はそのような列を作ります。

```html
<!-- v5で報告される: 3列目にセルがひとつも開始しない -->
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

`<col>`や`<colgroup>`が宣言した列も対象です。どの行も埋めない列マークアップは`<col>`要素上に報告されます。

```html
<!-- v5で報告される: 3列目にセルがひとつも開始しない -->
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

列マークアップより広い行は報告**されません**。アルゴリズムのStep 7が行に合わせてテーブルを広げるためです。

### 新規報告: セルがひとつも開始しない行

同じStepは行も対象にしているので、セルのない`<tr>`が報告されます。

```html
<!-- v5で報告される: 2行目にセルがひとつも開始しない -->
<table>
  <tr>
    <td></td>
  </tr>
  <tr></tr>
</table>
```

### 新規報告: 行グループの末尾を越える`rowspan`

セルは2つ以上の行グループのスロットにまたがれないので、`<thead>`、`<tbody>`、`<tfoot>`の残り行数より長い`rowspan`が属性上に報告されます。

```html
<!-- v5で報告される: rowspanがtbodyの末尾を越えている -->
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

### 報告されなくなったもの: 下の行をちょうど埋める`rowspan`

Step 6は`rowspan`が占有しているスロットを飛ばしてセルをアンカーするので、`rowspan`の下の行は最初の行と同じ幅になります。v4はセルを数えていたため、ここで余分な列を報告していました。

```html
<!-- v4では報告され、v5では適合 -->
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

## 対応方法

新規報告はいずれもHTML LSが著者に禁じているテーブルモデルエラーなので、マークアップを修正してください。`colspan`や`rowspan`を短くする、足りないセルを追加する、どの行も埋めない`<col>`を削除する、のいずれかです。

このルールのseverityは`warning`なので、これまで通っていたビルドが失敗するようになることはありません。v4の挙動を保ちたい場合はルールを無効にしてください。

```json
{
  "rules": {
    "table-row-column-alignment": false
  }
}
```
