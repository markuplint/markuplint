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

### デフォルトの警告の厳しさ

`error`
