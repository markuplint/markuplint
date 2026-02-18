# `invalid-attr` 破壊的変更: v4 から v5 への移行ガイド

## 対象読者

- `invalid-attr` オプション（`allowAttrs`、`disallowAttrs`、`attrs`）をカスタマイズしていた**設定ファイル作成者**

## 変更一覧

| 変更内容 | 影響範囲 |
|---------|---------|
| `{ type: X }` ラッパーの廃止 | `{ "value": { "type": "Int" } }` 等を使用していた設定 |
| `attrs` オプションの削除 | 非推奨の `attrs` オプション（v3.7.0 から非推奨）を使用していた設定 |
| オブジェクト形式の非推奨化 | `allowAttrs` / `disallowAttrs` でオブジェクト形式を使用していた設定 |

## `{ type: X }` ラッパーの廃止

v4 では、`allowAttrs` や `disallowAttrs` の属性値を `{ type: X }` というラッパーオブジェクトで指定できました。v5 ではこのラッパーが廃止され、型文字列を直接指定するようになりました。

### v4

```json
{
  "invalid-attr": {
    "options": {
      "allowAttrs": [
        {
          "name": "x-count",
          "value": { "type": "Int" }
        }
      ]
    }
  }
}
```

### v5

```json
{
  "invalid-attr": {
    "options": {
      "allowAttrs": [
        {
          "name": "x-count",
          "value": "Int"
        }
      ]
    }
  }
}
```

`{ enum: [...] }` と `{ pattern: "..." }` は従来通り動作します。

## `attrs` オプションの削除

v3.7.0 から非推奨だった `attrs` オプションが削除されました。代わりに `allowAttrs` と `disallowAttrs` を使用してください。

### v4

```json
{
  "invalid-attr": {
    "options": {
      "attrs": {
        "x-data": { "type": "Any" },
        "x-count": { "type": "Int" },
        "x-color": { "enum": ["red", "blue"] },
        "x-id": { "pattern": "/^[a-z]+$/" },
        "x-banned": { "disallowed": true }
      }
    }
  }
}
```

### v5

```json
{
  "invalid-attr": {
    "options": {
      "allowAttrs": [
        "x-data",
        { "name": "x-count", "value": "Int" },
        { "name": "x-color", "value": { "enum": ["red", "blue"] } },
        { "name": "x-id", "value": { "pattern": "/^[a-z]+$/" } }
      ],
      "disallowAttrs": ["x-banned"]
    }
  }
}
```

## オブジェクト形式の非推奨化

`allowAttrs` と `disallowAttrs` のオブジェクト形式は非推奨になりました。オブジェクト形式は v5 でもまだ動作しますが、将来のバージョンで削除される予定です。配列形式を使用してください。

### v4

```json
{
  "invalid-attr": {
    "options": {
      "allowAttrs": {
        "x-attr": "Int"
      }
    }
  }
}
```

### v5

```json
{
  "invalid-attr": {
    "options": {
      "allowAttrs": [
        {
          "name": "x-attr",
          "value": "Int"
        }
      ]
    }
  }
}
```
