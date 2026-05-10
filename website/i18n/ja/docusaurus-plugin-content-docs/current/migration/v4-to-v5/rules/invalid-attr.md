---
sidebar_position: 1
title: invalid-attr
---

# `invalid-attr` ルールの変更

このページでは `invalid-attr` ルールオプションの破壊的変更に加えて、**デフォルト設定のままで新たに検出対象となった値**について説明します。v4 では黙って受理されていたマークアップが、設定変更なしで v5 ではエラーとして現れる可能性があります。

## 変更一覧

| 変更内容                     | 影響範囲                                                            |
| ---------------------------- | ------------------------------------------------------------------- |
| `{ type: X }` ラッパーの廃止 | `{ "value": { "type": "Int" } }` を使用している設定                 |
| `attrs` オプションの削除     | 非推奨の `attrs` オプションを使用している設定                       |
| オブジェクト形式の非推奨化   | `allowAttrs` / `disallowAttrs` でオブジェクト形式を使用している設定 |
| v5 で新たに検出される値      | 全プロジェクト — 既存マークアップに対して新しい検証が発火           |

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

## v5 で新たに検出される値

:::info 挙動変更（設定の対応は不要）
v5 では、これまで `Any` として素通りしていた領域について `invalid-attr` のデフォルト検証範囲が拡張されました。設定を変更せずに v5 へアップグレードすると、以下のようなマークアップで v4 では発火しなかった違反が出る可能性があります。
:::

各行は検証追加を導入した Issue と、その根拠となる HTML / URL / Encoding Living Standard のセクションを示します。新しい違反に納得できない場合は、まずリンク先の Issue を確認してください — いくつかは、nu-validator が仕様より厳しく解釈していたケースについて仕様引用つきで `excluded-ids.json` に記録しながら導入されています。

| 対象領域                              | v5 で失敗する例                                 | Issue                                                         | 仕様                                                                                                      |
| ------------------------------------- | ----------------------------------------------- | ------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| `type` に応じた `input[value]`        | `<input type="color" value="red">`              | [#3598](https://github.com/markuplint/markuplint/issues/3598) | [HTML LS — input 要素](https://html.spec.whatwg.org/multipage/input.html#the-input-element)               |
| `rel` に応じた `link[as]`             | `<link rel="preload" as="audio">`               | [#3189](https://github.com/markuplint/markuplint/issues/3189) | [HTML LS — link 要素](https://html.spec.whatwg.org/multipage/semantics.html#attr-link-as)                 |
| `img[role]` + `alt=""`                | `<img role="presentation" alt="">`              | [#3641](https://github.com/markuplint/markuplint/issues/3641) | [ARIA in HTML — img](https://w3c.github.io/html-aria/#el-img)                                             |
| URL 内の禁止コードポイント            | `<a href="http://example.com/">`                | [#3629](https://github.com/markuplint/markuplint/issues/3629) | [URL LS — URL code points](https://url.spec.whatwg.org/#url-code-points)                                  |
| `http-equiv` に応じた `meta[content]` | `<meta http-equiv="refresh" content="garbage">` | [#3734](https://github.com/markuplint/markuplint/issues/3734) | [HTML LS — meta `http-equiv`](https://html.spec.whatwg.org/multipage/semantics.html#attr-meta-http-equiv) |
| `media=` の MQL5 厳格文法             | `<link media="screen and (color: 1em)">`        | [#3850](https://github.com/markuplint/markuplint/issues/3850) | [Media Queries Level 5 §4](https://www.w3.org/TR/mediaqueries-5/#mq-features)                             |

これらの厳格化を個別に無効化する設定はありません。特定のケースで問題がある場合は、失敗するマークアップと仕様の該当段落を添えて [Issue を起票](https://github.com/markuplint/markuplint/issues/new/choose) してください — 仕様の誤読が判明したものは修正または範囲を狭めます。
