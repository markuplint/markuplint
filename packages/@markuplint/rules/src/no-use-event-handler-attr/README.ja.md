# イベントハンドラ属性の使用禁止(`no-use-event-handler-attr`)

イベントハンドラ属性を指定すると警告します。

## ルールの詳細

👎 間違ったコード例

```html
<div onclick="() => doSomething()">Click</div>
```

👍 正しいコード例

```html
<div id="foo">Click</div>

<script>
  document.getElementById('foo').addEventListener('click', () => doSomething());
</script>
```

### 設定値

- 型: `boolean`
- デフォルト値: `true`

### オプション

#### `ignore`

除外するイベントハンドラを文字列か文字列の配列で指定します。正規表現形式も受け付けます。

### デフォルトの警告の厳しさ

`warning`
