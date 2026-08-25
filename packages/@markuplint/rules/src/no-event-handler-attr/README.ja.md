---
description: イベントハンドラ属性を指定すると警告します。
---

# `no-event-handler-attr`

イベントハンドラ属性を指定すると警告します。

<!-- textlint-disable ja-technical-writing/ja-no-mixed-period -->

❌ 間違ったコード例

```html
<div onclick="() => doSomething()">Click</div>
```

✅ 正しいコード例

```html
<div id="foo">Click</div>

<script>
  document.getElementById('foo').addEventListener('click', () => doSomething());
</script>
```

## 詳細

### 設定値

型: `boolean` | `string[]`

- `true`（デフォルト）: すべてのイベントハンドラ属性を禁止します。
- `string[]`: 指定したイベントのみ禁止します。リストにないイベントハンドラは許可されます。イベント名は `on` プレフィックスなしの小文字で指定します（例: `"onclick"` ではなく `"click"`）。正規表現パターン（例: `/^mouse/`）も使用できます。

```json class=config
{
  "rules": {
    "no-event-handler-attr": true
  }
}
```

特定のイベントのみ禁止する場合:

```json class=config
{
  "rules": {
    "no-event-handler-attr": ["click"]
  }
}
```

```json class=config
{
  "rules": {
    "no-event-handler-attr": ["click", "mousedown"]
  }
}
```

正規表現パターンを使用する場合:

```json class=config
{
  "rules": {
    "no-event-handler-attr": ["/^mouse/"]
  }
}
```

### `ignore` オプション

`ignore` オプションは**属性名**（`on` プレフィックス付き、例: `"onclick"`）で特定の属性を除外します。`value` より先に評価されます。文字列および正規表現パターンを受け付けます。

```json class=config
{
  "rules": {
    "no-event-handler-attr": {
      "value": ["click", "mousedown"],
      "options": {
        "ignore": "onclick"
      }
    }
  }
}
```

上記の例では `onclick` が `ignore` で除外されるため、`onmousedown` のみ報告されます。

<!-- textlint-enable ja-technical-writing/ja-no-mixed-period -->
