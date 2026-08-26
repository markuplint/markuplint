# `require-element` 破壊的変更: v4 から v5 への移行ガイド

## 対象読者

- `required-element` ルール（`require-element` に改名）を使用する**設定ファイル作成者**

## 変更一覧

| 変更内容 | 影響範囲 |
|---------|---------|
| `required-element` から `require-element` に改名 | このルールを使用する全ての設定ファイル作成者 — 旧名は非推奨警告を出しつつ引き続き動作し、v6 で削除されます |
| `ignoreOmittedElements` のデフォルト値が `false` から `true` に変更 | ゴースト要素で要件を満たしていた設定 |

## ルール名の変更

v5 の命名規則（欠落検査は単数形の `require-*`、`required-*` は使わない）に従い、`required-element` は `require-element` に改名されました。旧名は v6 で削除されるまで、非推奨警告を出しつつ引き続き動作します。

```json
{
  "rules": {
    "require-element": ["meta[charset=\"UTF-8\"]"]
  }
}
```

## `ignoreOmittedElements` のデフォルト値

HTML では特定のタグを省略できます（例: `<tbody>`）。HTML パーサーはこれらの省略された要素をゴーストノードとして暗黙的に生成します。

v4 では、ゴースト要素もデフォルトで `required-element` の要件を満たしていました。v5 では、ゴースト要素はデフォルトで**無視**されます。ソースコードに明示的に記述された要素のみが要件を満たします。

### v4

ゴースト `<tbody>` が要件を満たす（デフォルト `ignoreOmittedElements: false`）:

```html
<!-- v4 では違反なし -->
<table>
  <tr><td>Text</td></tr>
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

### v5

同じ設定でゴースト `<tbody>` は無視されるため、違反が報告されます（デフォルト `ignoreOmittedElements: true`）。`<tbody>` を明示的に記述するか:

```html
<table>
  <tbody>
    <tr><td>Text</td></tr>
  </tbody>
</table>
```

または、オプションを `false` に明示的に設定して v4 の動作を復元してください:

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
