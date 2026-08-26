---
sidebar_position: 2
title: required-element
---

# `required-element` ルールの変更

このページでは `required-element` ルールのリネームとデフォルト値の変更について説明します。このルールで必須の子要素をチェックしている場合は確認してください。

## 変更一覧

| 変更内容                                               | 影響範囲                             |
| ------------------------------------------------------ | ------------------------------------ |
| `require-element` にリネーム                           | このルールを使っている設定すべて     |
| `ignoreOmittedElements` のデフォルト: `false` → `true` | ゴースト要素で要件を満たしていた設定 |

## ルールのリネーム

`required-element` は `require-element` になりました。「欠けているものを検査するルールは `require-*`（単数形）」という v5 の命名規則に従ったものです。

```json
{
  "rules": {
    "require-element": ["meta[charset=\"UTF-8\"]"]
  }
}
```

:::tip
旧名もそのまま動作します。markuplint が非推奨警告を報告し、設定を `require-element` に自動的に適用します。旧名は v6 で削除されます。リネームの全一覧は[改名と分割](/docs/migration/v4-to-v5/rules/rule-names)にあります。
:::

## 何が変わったか

HTML では特定のタグを省略できます。たとえば `<tbody>` は `<table>` 内で省略可能です。省略された場合でも HTML パーサーは内部的に「ゴースト」ノードを生成します。

:::caution 破壊的変更
v5 ではゴースト要素がデフォルトで**無視**されます。ソースコードに明示的に記述された要素のみが `required-element` のチェックを満たします。
:::

### 変更前（v4）

ゴースト `<tbody>` が要件を満たしていたため、違反は報告されませんでした：

```html
<!-- v4 では違反なし -->
<table>
  <tr>
    <td>Text</td>
  </tr>
</table>
```

```json
{
  "nodeRules": [
    {
      "selector": "table",
      "rules": {
        "required-element": ["tbody"]
      }
    }
  ]
}
```

### 変更後（v5）

同じ設定で、ゴースト `<tbody>` が無視されるため違反が報告されるようになりました。

## 対応方法

2つの方法があります。

**方法1: 要素を明示的に記述する**（推奨）：

```html
<table>
  <tbody>
    <tr>
      <td>Text</td>
    </tr>
  </tbody>
</table>
```

**方法2: v4 の動作を復元する** -- `ignoreOmittedElements` を `false` に設定します。

```json
{
  "nodeRules": [
    {
      "selector": "table",
      "rules": {
        "require-element": {
          "value": ["tbody"],
          "options": {
            "ignoreOmittedElements": false
          }
        }
      }
    }
  ]
}
```

:::tip
要素を明示的に記述することで HTML がより明確になり、パーサーが生成するゴーストノードに依存しなくなります。方法1を推奨します。
:::
