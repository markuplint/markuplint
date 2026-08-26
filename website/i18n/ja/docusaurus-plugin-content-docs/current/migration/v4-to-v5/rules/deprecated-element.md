---
sidebar_position: 3
title: deprecated-element
---

# `deprecated-element` ルールの変更

このページでは `deprecated-element` ルールの分割と検出範囲の変更について説明します。このルールを使っている場合は確認してください。

## 変更一覧

| 変更内容                                                | 影響範囲                                                     |
| ------------------------------------------------------- | ------------------------------------------------------------ |
| `no-obsolete-element` と `no-deprecated-element` に分割 | `deprecated-element` を使っている設定すべて                  |
| 非標準要素の検出が `no-nonstandard-features` へ移動     | 非標準要素の検出目的で `deprecated-element` を使っていた設定 |

## ルールの2分割

`deprecated-element` は独立した2つのチェックを束ねていました。仕様が完全に削除した要素（**obsolete** — MUST レベルの適合性違反）と、仕様が定義を保ちつつ非推奨とマークする要素（**deprecated** — MDN/BCD 由来の事実データ）です。v5 ではそれぞれが独自の severity を持つ別のルールになりました。

| 新ルール                | 検査内容                                              | 既定 severity |
| ----------------------- | ----------------------------------------------------- | ------------- |
| `no-obsolete-element`   | HTML LS §16.2 が完全に削除した要素（例: `<marquee>`） | `error`       |
| `no-deprecated-element` | 仕様は定義を保つが MDN/BCD が非推奨とマークする要素   | `warning`     |

```json
{
  "rules": {
    "no-obsolete-element": true,
    "no-deprecated-element": true
  }
}
```

:::tip
`deprecated-element` はそのまま動作します。markuplint が非推奨警告を報告し、設定を両ルールへ自動的に展開します。旧名は v6 で削除されます。分割の全一覧は[改名と分割](/docs/migration/v4-to-v5/rules/rule-names)にあります。
:::

:::caution severity の変更
deprecated 側は `error` から `warning` に下がります。MDN/BCD の非推奨は仕様の MUST ではなく事実データであるためです。obsolete 側は `error` のままです。
:::

## 非標準要素の検出の移動

v4 の `deprecated-element` は3つのカテゴリを検出していました。**deprecated**、**obsolete**、そして**非標準**の要素です。

v5 では非標準要素の検出が独立した `no-nonstandard-features` ルールへ移りました。このルール自体も旧 `no-unsupported-features` ルールから分割されたものです。`no-obsolete-element` も `no-deprecated-element` も非標準要素を検出しません。

### 変更前（v4）

`deprecated-element` が `<bgsound>` のような非標準要素を自動的に検出していました:

```html
<!-- v4 では deprecated-element が報告 -->
<bgsound src="music.mid"></bgsound>
```

### 変更後（v5）

どちらの後継ルールも非標準要素を報告しません。この検出を復元するには `no-nonstandard-features` を有効にしてください:

```json
{
  "rules": {
    "no-nonstandard-features": true
  }
}
```

:::tip
`recommended` プリセットを使っている場合、`compat` プリセット経由で既に有効になっています。対応は不要です。
:::
