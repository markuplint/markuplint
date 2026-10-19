---
description: 要素の属性の順序を統一します。
---

# `attr-order`

要素の**属性**の順序を統一します。デフォルトではアルファベット順にソートされます。優先度リスト、定義済みグループ（`global`、`event`、`aria`、`role`、`data`、`spread`）、カスタムパターンを使って順序を指定できます。

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
  "attr-order": [
    { "group": "global" },
    { "group": "role" },
    { "group": "aria" },
    { "group": "event" },
    { "group": "data" }
  ]
}
```

| グループ | マッチ対象                                         |
| -------- | -------------------------------------------------- |
| `global` | HTMLグローバル属性（`id`、`class`、`style` など）  |
| `event`  | イベントハンドラ属性（`onclick`、`onchange` など） |
| `aria`   | ARIA属性（`aria-label`、`aria-hidden` など）       |
| `role`   | `role` 属性                                        |
| `data`   | カスタムデータ属性（`data-*`）                     |
| `spread` | スプレッド属性（JSXの `{...props}`）               |

### パターンマッチ

```json
{
  "attr-order": [{ "pattern": "^data-" }]
}
```

パターンは、ソースコードに**書かれたまま**の属性名に対してマッチします。フラグは指定できず、大文字・小文字は畳み込みません。たとえば `^id$` は `id` にマッチしますが `ID` にはマッチしません。`[Ii][Dd]` は両方の綴りにマッチします。

### 属性名の大文字・小文字

属性名はDOMが比較する方法で比較します。HTML要素の `ID` と `id` は同じ属性なので、`<div ID class>` はすでにアルファベット順です（`class` が `id` より前）。これは、アルファベット順、定義済みグループ、`name` エントリ、グループ内の `order` 配列に適用されます。同じ属性になる名前はソースコード上の順序を保ち、自動修正は各名前の綴りをそのまま残します。大文字・小文字を畳み込まずにDOM APIで属性を設定する構文の要素（たとえばJSXの `<svg>`）では、書かれたとおりの綴りで比較します。`pattern` エントリは上記のとおり例外です。

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
