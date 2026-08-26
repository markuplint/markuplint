---
description: 要素の属性の順序を統一します。
---

# `attr-order`

要素の**属性**の順序を統一します。デフォルトではアルファベット順にソートされます。優先度リスト、定義済みグループ（`global`、`event`、`aria`、`data`、`spread`）、カスタムパターンを使って順序を指定できます。

:::info

いずれのプリセットにも含まれません。HTML仕様は属性の順序を規定していないため、これは純粋にプロジェクトのスタイル選好であり、有用にするには設定が必要です。

:::

<!-- textlint-disable ja-technical-writing/ja-no-mixed-period -->

❌ 間違ったコード例

```html
<div style="color: red" class="foo" id="bar"></div>
```

✅ 正しいコード例

```html
<div class="foo" id="bar" style="color: red"></div>
```

## 設定

### 優先度リスト

```json
{
  "attr-order": ["id", "class", "style"]
}
```

リストにマッチした属性が先頭に配置されます。マッチしなかった属性はアルファベット順で続きます。

### 定義済みグループ

```json
{
  "attr-order": [{ "group": "global" }, { "group": "aria" }, { "group": "event" }, { "group": "data" }]
}
```

| グループ | マッチ対象                                         |
| -------- | -------------------------------------------------- |
| `global` | HTMLグローバル属性（`id`、`class`、`style` など）  |
| `event`  | イベントハンドラ属性（`onclick`、`onchange` など） |
| `aria`   | ARIA属性（`aria-label`、`aria-hidden` など）       |
| `data`   | カスタムデータ属性（`data-*`）                     |
| `spread` | スプレッド属性（JSXの `{...props}`）               |

### パターンマッチ

```json
{
  "attr-order": [{ "pattern": "^data-" }]
}
```

### グループ内ソート順

```json
{
  "attr-order": [
    { "group": "global", "order": "alphabetical" },
    { "group": "aria", "order": ["aria-label", "aria-describedby", "aria-hidden"] },
    { "group": "event", "order": "source-order" }
  ]
}
```

- `"alphabetical"`（デフォルト） — グループ内でアルファベット順にソート。
- `"source-order"` — グループ内で元の順序を維持。
- `string[]` — 固定順序。リストにない属性はアルファベット順で末尾に追加。

### オプション

#### `alphabetical`

型: `boolean` デフォルト: `true`

マッチしなかった属性をアルファベット順にソートするかどうか。`false` の場合、マッチしなかった属性は元の順序を維持します。

```json
{
  "attr-order": {
    "value": ["id", "class"],
    "options": { "alphabetical": false }
  }
}
```

<!-- textlint-enable ja-technical-writing/ja-no-mixed-period -->
