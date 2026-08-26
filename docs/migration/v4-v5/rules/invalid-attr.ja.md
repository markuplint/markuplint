# `invalid-attr` 破壊的変更: v4 から v5 への移行ガイド

## 対象読者

- `invalid-attr` オプション（`allowAttrs`、`disallowAttrs`、`attrs`）をカスタマイズしていた**設定ファイル作成者**
- `invalid-attr` を何らかの形で使用している**全ユーザー** — v5 では4つのルールに分割されます

## 変更一覧

| 変更内容 | 影響範囲 |
|---------|---------|
| 4つのルールに分割 | `invalid-attr` を何らかの形で使用している全設定 — 旧名は非推奨警告を出しつつ引き続き動作し、v6 で削除されます |
| `{ type: X }` ラッパーの廃止 | `{ "value": { "type": "Int" } }` 等を使用していた設定 |
| `attrs` オプションの削除 | 非推奨の `attrs` オプション（v3.7.0 から非推奨）を使用していた設定 |
| オブジェクト形式の非推奨化 | `allowAttrs` / `disallowAttrs` でオブジェクト形式を使用していた設定 |

## 4つのルールへの分割

`invalid-attr` は4つの独立した検査を1つのルールに束ねていました。v5 ではそれぞれが独立したルールになり、個別に有効化・無効化・severity設定ができます。

| 新ルール | 検査内容 | `allowAttrs` / `disallowAttrs` |
|---------|---------|-------------------------------|
| `no-unknown-attr` | 仕様に定義のない属性名（typo候補・大文字小文字不一致） | `allowAttrs` が適用される |
| `no-disallowed-attr` | 仕様に定義はあるがこの文脈では許可されない属性（`noUse`、条件付き許可の条件外、autonomous custom element 上の `is`） | `allowAttrs` が適用される |
| `no-invalid-attr-value` | 属性値が型・文法チェックに失敗 | `allowAttrs` が適用される |
| `no-restricted-attr` | ユーザー定義の拒否リスト — 4つのうち `disallowAttrs` が適用される唯一のルール | `disallowAttrs` が適用される |

`invalid-attr: v` は引き続き動作します — 非推奨警告が報告され、設定は自動的に4つのルールに展開されます: `allowAttrs` は `no-unknown-attr`/`no-disallowed-attr`/`no-invalid-attr-value` にコピーされ、`disallowAttrs` は `no-restricted-attr` にコピーされます（実際に設定されている場合のみ追加）。旧名は v6 で削除されます。

```json
{
  "rules": {
    "no-unknown-attr": true,
    "no-disallowed-attr": true,
    "no-invalid-attr-value": true,
    "no-restricted-attr": {
      "options": {
        "disallowAttrs": ["x-banned"]
      }
    }
  }
}
```

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
  "no-unknown-attr": {
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

v3.7.0 から非推奨だった `attrs` オプションが削除されました。代わりに `allowAttrs` と `disallowAttrs` を使用してください — それぞれ対応する新ルールに振り分けられます。

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
  "rules": {
    "no-unknown-attr": {
      "options": {
        "allowAttrs": [
          "x-data",
          { "name": "x-count", "value": "Int" },
          { "name": "x-color", "value": { "enum": ["red", "blue"] } },
          { "name": "x-id", "value": { "pattern": "/^[a-z]+$/" } }
        ]
      }
    },
    "no-restricted-attr": {
      "options": {
        "disallowAttrs": ["x-banned"]
      }
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
  "no-unknown-attr": {
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
