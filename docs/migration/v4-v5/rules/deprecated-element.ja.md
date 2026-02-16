# `deprecated-element` 破壊的変更: v4 から v5 への移行ガイド

## 対象読者

- 非標準要素の検出に `deprecated-element` を使用していた**設定ファイル作成者**

## 変更一覧

| 変更内容 | 影響範囲 |
|---------|---------|
| 非標準要素の検出が `no-unsupported-features` に移管 | `deprecated-element` 単体で非標準要素を検出していた設定 |

## 非標準要素の検出が移管

v4 では、`deprecated-element` は**非推奨（deprecated）**、**廃止（obsolete）**、**非標準（non-standard）**の3種類を検出していました。

v5 では、非標準の検出は新しい `no-unsupported-features` ルールの `checkNonStandard` オプションに移管されました。`deprecated-element` は非推奨と廃止のみを検出します。

### v4

`deprecated-element` が非標準要素（例: `<bgsound>`）を自動で検出:

```html
<!-- v4 では deprecated-element が報告 -->
<bgsound src="music.mid">
```

### v5

`deprecated-element` は非標準要素を報告しなくなりました。検出を復元するには、`no-unsupported-features` を有効にしてください:

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

`recommended` プリセットを使用している場合は、`compat` プリセット経由で自動的に有効になっているため、変更は不要です。
