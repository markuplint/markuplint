---
title: アクセシブルな名前必須(require-accessible-name)
---

# アクセシブルな名前必須(`require-accessible-name`)

要素にアクセシブルな名前がなければ警告します。名前が必要かどうかは ARIA ロールによって異なります。

## ルールの詳細

👎 間違ったコード例

```html
<button>
  <span></span>
  <span></span>
  <span></span>
</button>
```

👍 正しいコード例

```html
<button>
  <span class="visually-hidden">Menu</span>
  <span></span>
  <span></span>
  <span></span>
</button>
```

### 設定値

- 型: `boolean`
- デフォルト値: `true`

### オプション

##### `ariaVersion`

評価する WAI-ARIA のバージョンを指定します。

- 型: `"1.1" | "1.2"`
- 省略可
- 初期値: `1.2`

### デフォルトの警告の厳しさ

`error`
