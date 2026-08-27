# `deprecated-element` 破壊的変更: v4 から v5 への移行ガイド

## 対象読者

- `deprecated-element` を使用している**設定ファイル作成者**

## 変更一覧

| 変更内容 | 影響範囲 |
|---------|---------|
| `no-obsolete-element` と `no-deprecated-element` に分割 | `deprecated-element` を何らかの形で使用している全設定 — 旧名は非推奨警告を出しつつ引き続き動作し、v6 で削除されます |

## 2つのルールへの分割

`deprecated-element` は2つの独立した検査を束ねていました: 仕様から完全に削除された要素（**廃止 / obsolete**、MUSTレベルの適合性違反）と、仕様上は現存するが非推奨とマークされた要素（**非推奨 / deprecated**、MDN/BCD 由来の事実データ）です。v5 ではそれぞれが独立したルールとなり、severityも個別に設定されます:

| 新ルール | 検査内容 | デフォルトseverity |
|---------|---------|-------------------|
| `no-obsolete-element` | HTML LS §16.2 で完全に削除された要素（例: `<marquee>`） | `error` |
| `no-deprecated-element` | 仕様上は現存するが MDN/BCD が非推奨とマークする要素 | `warning` |

`deprecated-element: v` は引き続き動作します — 非推奨警告が報告され、設定は自動的に両方のルールに展開されます。旧名は v6 で削除されます。

```json
{
  "rules": {
    "no-obsolete-element": true,
    "no-deprecated-element": true
  }
}
```

## このルールとは無関係: 非標準要素の検出

`deprecated-element` は v4 でも非標準要素を検出したことは一度もありません — この再設計直前のルール実装を確認済みで、検査していたのは `spec.obsolete`/`spec.deprecated` のみで `spec.nonStandard` は見ていませんでした。非標準要素の検出（`<bgsound>` など）は別の v4 ルール `no-unsupported-features` の `checkNonStandard` オプション（既定 `false`）が担っていました。このオプションが v5 で独立した `no-nonstandard-features` ルールになっています。詳細は[ルールの改名・分割](./rule-names.ja.md)の `no-unsupported-features` の行を参照してください。
