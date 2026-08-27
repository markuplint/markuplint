---
sidebar_position: 3
title: deprecated-element
---

# `deprecated-element` ルールの変更

このページでは `deprecated-element` ルールの分割について説明します。このルールを使っている場合は確認してください。

## 変更一覧

| 変更内容                                                | 影響範囲                                    |
| ------------------------------------------------------- | ------------------------------------------- |
| `no-obsolete-element` と `no-deprecated-element` に分割 | `deprecated-element` を使っている設定すべて |

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

:::note このルールとは無関係: 非標準要素の検出
`deprecated-element` が非標準要素を検出したことは一度もありません — 検出していたのは obsolete と deprecated の2つだけで、どちらも上で説明した通りです。非標準要素の検出（`<bgsound>` など）は全く別の v4 ルール `no-unsupported-features` の `checkNonStandard` オプション（既定 `false` — 設定で明示的に有効化しない限り何もしませんでした）の担当でした。このオプションが v5 で独立した `no-nonstandard-features` ルールになっています。`no-unsupported-features` の分割の全体像は[改名と分割](/docs/migration/v4-to-v5/rules/rule-names)を参照してください。
:::
