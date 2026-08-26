# `deprecated-element` 破壊的変更: v4 から v5 への移行ガイド

## 対象読者

- `deprecated-element` を使用している、または非標準要素の検出のために利用していた**設定ファイル作成者**

## 変更一覧

| 変更内容 | 影響範囲 |
|---------|---------|
| `no-obsolete-element` と `no-deprecated-element` に分割 | `deprecated-element` を何らかの形で使用している全設定 — 旧名は非推奨警告を出しつつ引き続き動作し、v6 で削除されます |
| 非標準要素の検出が `no-nonstandard-features` に移管 | `deprecated-element` 単体で非標準要素を検出していた設定 |

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

## 非標準要素の検出が移管

v4 では、`deprecated-element` は**非推奨（deprecated）**、**廃止（obsolete）**、**非標準（non-standard）**の3種類を検出していました。

v5 では、非標準の検出は独立した `no-nonstandard-features` ルール（旧 `no-unsupported-features` ルールから分割）に移管されました。`no-obsolete-element`/`no-deprecated-element` はいずれも非標準要素を検出しません。

### v4

`deprecated-element` が非標準要素（例: `<bgsound>`）を自動で検出:

```html
<!-- v4 では deprecated-element が報告 -->
<bgsound src="music.mid">
```

### v5

`no-obsolete-element`・`no-deprecated-element` のいずれも非標準要素を報告しません。検出を復元するには、`no-nonstandard-features` を有効にしてください:

```json
{
  "rules": {
    "no-nonstandard-features": true
  }
}
```

`recommended` プリセットを使用している場合は、`compat` プリセット経由で自動的に有効になっているため、変更は不要です。
