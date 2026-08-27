---
sidebar_position: 6
title: table-row-column-alignment
---

# `table-row-column-alignment`ルールの変更

このページでは`table-row-column-alignment`ルールの分割、severityの昇格、追加された3つの検査、削除された1つの誤検出について説明します。`a11y`プリセットを使っている場合、またはこのルールを直接有効にしている場合は読んでください。

## 概要

| 変更                                                                                    | 影響を受ける人                                              |
| --------------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| ルールの4分割                                                                           | `table-row-column-alignment`を使っている設定すべて          |
| 4つのうち3つが`warning`から`error`に昇格                                                | zero-warningsゲートを使っているチーム                       |
| セルがひとつも開始しない列と行、および行グループの末尾を越える`rowspan`を報告するように | `colspan`、`rowspan`、`<col>`を使うテーブルをlintしている人 |
| `rowspan`が下の行をちょうど埋めている場合に余分な列を報告しなくなった                   | 以前の誤検出を回避していた人                                |

## ルールの4分割

このルールは、仕様が許容するスタイル的な検査1件と、テーブルモデルエラー3件を束ねていました。v5ではそれぞれが別のルールになります。

| 新ルール                      | 検査内容                                                         | 既定severity |
| ----------------------------- | ---------------------------------------------------------------- | ------------ |
| `no-table-cell-overlap`       | 2つのセルが同じスロットを覆うようにアンカーされている（Step 14） | `error`      |
| `no-table-span-overflow`      | `rowspan`が行グループの末尾を越えている                          | `error`      |
| `no-empty-table-track`        | セルがひとつもアンカーされていない行・列（Step 20）              | `error`      |
| `consistent-table-row-length` | 行の列数がテーブルの他の行と一致しない                           | `warning`    |

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
`table-row-column-alignment`はそのまま動作します。markuplintが非推奨警告を報告し、設定を4ルールすべてへ自動的に展開します。旧名はv6で削除されます。分割の全一覧は[改名と分割](/docs/migration/v4-to-v5/rules/rule-names)にあります。
:::

:::caution severityの昇格で緑だったCIが赤くなることがあります
v4ではルール全体が`warning`でした。テーブルモデルエラーの3件は、HTML LSが著者に対して生成を禁じている（MUST）ため`error`になりました。`consistent-table-row-length`だけが`warning`のままです。HTML LS §4.9.12.1 Step 7は幅の広い行に合わせてテーブルを拡張するため、不揃いなテーブルは適合性違反ではなく「おそらく間違い」に留まります。

`--max-warnings 0`のような厳格なゲートを使っている場合は、アップグレード前にこれらのルールの現在のwarning件数を確認してください。
:::

テーブルにセルの重複がある場合、他の3ルールが導出するグリッドは推測に基づくものになるため、`no-table-cell-overlap`が報告したテーブルに対して`no-table-span-overflow`、`no-empty-table-track`、`consistent-table-row-length`は何も報告しません。

## 変更点

v4では行ごとにセルを数えていました。v5では[HTML LS §4.9.12.1 _Forming a table_](https://html.spec.whatwg.org/multipage/tables.html#forming-a-table)のスロットグリッドを構築します。これはテーブルモデルエラーが定義されている土台のモデルです。行の一貫性に関する報告（`One extra column in a row`、`One missing column in a row`）は内容としては変わらず、`consistent-table-row-length`に移りました。グリッド化によって3つの検査が加わり、1つの誤検出がなくなります。

### 新規報告: セルがひとつも開始しない列

`no-empty-table-track`が報告します。アルゴリズムのStep 20は、セルがアンカーされていないスロットだけで構成される列をテーブルモデルエラーとしています。最後のセルより先まで伸びる`colspan`や、`rowspan`の継続スロットの隣から始まる`colspan`はそのような列を作ります。

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

同じStepは行も対象にしているので、セルのない`<tr>`も同じく`no-empty-table-track`が報告します。

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

セルは2つ以上の行グループのスロットにまたがれないので、`<thead>`、`<tbody>`、`<tfoot>`の残り行数より長い`rowspan`が`no-table-span-overflow`によって属性上に報告されます。

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

この3件はv5では`error`なので、v4ではwarningに留まっていたテーブルモデルエラーが、errorを致命的として扱うビルドを失敗させるようになります。v4の挙動を保ちたい場合は、severityを下げるか:

```json
{
  "rules": {
    "no-table-cell-overlap": { "severity": "warning" },
    "no-table-span-overflow": { "severity": "warning" },
    "no-empty-table-track": { "severity": "warning" }
  }
}
```

検査自体を無効にしてください:

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
