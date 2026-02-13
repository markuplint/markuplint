# ARIA 破壊的変更: v4 から v5 への移行ガイド

## 対象読者

- ARIA バージョンオプションを設定する**設定ファイル作成者**
- ARIA ロールやプロパティ情報にアクセスする**カスタムルール作成者**
- `wai-aria` などのルールで ARIA 属性をリントする**ユーザー**

## 変更一覧

| 変更内容 | 影響範囲 |
|---------|---------|
| ARIA 1.3 サポートの追加 | `ariaVersion` が `"1.3"` の場合の新しい動作 |
| ARIA 1.3 で `generic` ロールが透過的に | コンテンツモデルの検証 |
| ARIA 1.3 で `image` / `img` ロールが同義に | 許可されるロールの検証 |
| `wai-aria` ルールオプションのリネーム | `checkingRequiredOwnedElements` を使用する設定ファイル |

## ARIA 1.3 サポート

v5 では ARIA 1.3 を選択可能なバージョンとして追加しました。デフォルトは `"1.2"` のままなので、**オプトインしない限り既存のユーザーへの動作変更はありません**。

### 有効化方法

`ruleCommonSettings` でグローバルに `ariaVersion` を設定します（[設定の移行ガイド](./config.ja.md)参照）:

```json
{
  "ruleCommonSettings": {
    "ariaVersion": "1.3"
  }
}
```

または、ルールごとに設定:

```json
{
  "rules": {
    "wai-aria": {
      "options": {
        "version": "1.3"
      }
    }
  }
}
```

## Generic ロールの透過性

ARIA 1.3 における最も重要な変更は、`generic` ロールを持つ要素（素の `<div>` や `<span>` を含む）がアクセシビリティツリーの所有関係走査において**透過的**になることです。

### v4（ARIA 1.2）

`<ul>` と `<li>` の間の `<div>` ラッパーが親子ロールの関係を壊していました:

```html
<!-- ARIA 1.2: 失敗 — <div> が list > listitem の関係をブロック -->
<ul>
  <div>
    <li>item</li>
  </div>
</ul>
```

### v5 で ARIA 1.3 を使用した場合

ARIA 1.3 では、ユーザーエージェントは `generic` または `none` ロールを持つ介在要素を無視しなければならないと定義しています:

```html
<!-- ARIA 1.3: 成功 — <div>（generic）は透過的 -->
<ul>
  <div>
    <li>item</li>
  </div>
</ul>
```

影響を受ける機能:

- **必須アクセシビリティ親ロール**（`matchesContextRole`）— `generic` または `none` ロールの親要素がスキップされる
- **許可されるアクセシビリティ子ロール**（`hasRequiredOwnedElement`）— 子孫走査時に `generic` 要素が透過的に
- **プレゼンテーショナルロールの競合解決** — 非プレゼンテーショナルな祖先を検索する際に `generic` 要素がスキップされる

### バージョンによる動作の違い

| 動作 | `'1.1'` / `'1.2'` | `'1.3'` |
| --- | --- | --- |
| `generic` が所有関係で透過的 | いいえ | はい |
| `generic` がコンテキストロールで透過的 | いいえ | はい |
| `presentation` / `none` が透過的 | はい | はい |

## Image / IMG ロールの同義語

ARIA 1.3 では `image` がプライマリロール名、`img` がシノニムとなりました。いずれかが要素の許可されるロールに含まれる場合、両方が受け入れられます:

```html
<!-- ARIA 1.2: 許可されるロールは "img" のみ -->
<!-- ARIA 1.3: 許可されるロールは "image" と "img" の両方 -->
<img alt="photo" />
```

## ルールオプションのリネーム

`wai-aria` ルールの所有要素チェックオプションがリネームされました:

| v5（新） | v4（非推奨） |
|---------|------------|
| `checkingAllowedAccessibilityChildRoles` | `checkingRequiredOwnedElements` |

両方のオプションは引き続き機能します — チェックは両方が `true`（デフォルト）の場合のみ実行されます。旧名を使用する既存の設定は引き続き動作します。

```json
{
  "rules": {
    "wai-aria": {
      "options": {
        "checkingAllowedAccessibilityChildRoles": false
      }
    }
  }
}
```

## 用語の変更

ARIA 1.3 ではいくつかの概念がリネームされました。`ARIARole` 型は新旧両方のプロパティ名を公開しています:

| ARIA 1.3（新） | ARIA 1.2（非推奨） |
|---------------|-----------------|
| `requiredAccessibilityParentRole` | `requiredContextRole` |
| `allowedAccessibilityChildRoles` | `requiredOwnedElements` |

両方のプロパティは同じ値を保持します。内部コードは新しい名前を使用し、旧名は `@deprecated` エイリアスとして保持されています。
