---
sidebar_position: 1
title: invalid-attr
---

# `invalid-attr` ルールの変更

このページでは `invalid-attr` ルールオプションの破壊的変更について説明します。設定で `allowAttrs`、`disallowAttrs`、`attrs` をカスタマイズしている場合は確認してください。

## 変更一覧

| 変更内容                     | 影響範囲                                                            |
| ---------------------------- | ------------------------------------------------------------------- |
| `{ type: X }` ラッパーの廃止 | `{ "value": { "type": "Int" } }` を使用している設定                 |
| `attrs` オプションの削除     | 非推奨の `attrs` オプションを使用している設定                       |
| オブジェクト形式の非推奨化   | `allowAttrs` / `disallowAttrs` でオブジェクト形式を使用している設定 |

## `{ type: X }` ラッパーの廃止

:::caution 破壊的変更
属性値の `{ type: X }` ラッパーオブジェクトが廃止されました。型文字列を直接指定してください。
:::

**変更前（v4）：**

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

**変更後（v5）：**

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

:::note
`{ enum: [...] }` と `{ pattern: "..." }` の形式は従来通り動作します。廃止されたのは `{ type: X }` ラッパーのみです。
:::

## `attrs` オプションの削除

:::caution 破壊的変更
`attrs` オプションは削除されました。v3.7.0 から非推奨でした。代わりに `allowAttrs` と `disallowAttrs` を使用してください。
:::

**変更前（v4）：**

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

**変更後（v5）：**

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

主な違い：

- 許可する属性は `allowAttrs` に配列で指定
- `"disallowed": true` だった属性は `disallowAttrs` に移動
- 値の制約がない属性は文字列で指定可能（例: `"x-data"`）

## オブジェクト形式の非推奨化

:::info 非推奨の警告
`allowAttrs` と `disallowAttrs` のオブジェクト形式は v5 でもまだ動作しますが、将来のバージョンで削除されます。今のうちに配列形式に切り替えてください。
:::

**変更前（オブジェクト形式）：**

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

**変更後（配列形式）：**

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
