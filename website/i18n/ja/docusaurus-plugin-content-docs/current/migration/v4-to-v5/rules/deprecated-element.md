---
sidebar_position: 3
title: deprecated-element
---

# `deprecated-element` ルールの変更

このページでは `deprecated-element` ルールのスコープ変更について説明します。非標準要素の検出にこのルールを使用していた場合は確認してください。

## 変更一覧

| 変更内容                                            | 影響範囲                                            |
| --------------------------------------------------- | --------------------------------------------------- |
| 非標準要素の検出が `no-unsupported-features` に移管 | `deprecated-element` で非標準要素を検出していた設定 |

## 何が変わったか

v4 では `deprecated-element` は3種類の要素を検出していました：

- **非推奨（deprecated）** 要素
- **廃止（obsolete）** 要素
- **非標準（non-standard）** 要素

v5 では、非標準要素の検出は新しい `no-unsupported-features` ルールに移管されました。`deprecated-element` は非推奨と廃止の要素のみを検出します。

### 変更前（v4）

`deprecated-element` が `<bgsound>` のような非標準要素を自動で検出していました：

```html
<!-- v4 では deprecated-element が報告 -->
<bgsound src="music.mid"></bgsound>
```

### 変更後（v5）

`deprecated-element` は非標準要素を報告しなくなりました。

## 対応方法

`no-unsupported-features` ルールの `checkNonStandard` オプションを有効にしてください：

```json
{
  "rules": {
    "no-unsupported-features": {
      "options": {
        "checkNonStandard": true
      }
    }
  }
}
```

:::tip
`recommended` プリセットを使用している場合、`no-unsupported-features` は `compat` プリセット経由で自動的に有効になっています。特に対応は不要です。
:::
