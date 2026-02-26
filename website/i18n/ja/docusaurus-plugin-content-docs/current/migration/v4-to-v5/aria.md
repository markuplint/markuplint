---
sidebar_position: 4
title: ARIA
---

# ARIA の変更

v5 では ARIA 1.3 のサポートが追加され、デフォルトの ARIA バージョンが 1.3 に変更されました。`wai-aria` ルールのオプション名も変更されています。

## 変更点

| 変更内容                                    | 影響を受けるユーザー                                  |
| ------------------------------------------- | ----------------------------------------------------- |
| ARIA 1.3 サポートの追加（デフォルト）       | すべてのユーザー                                      |
| 1.3 で `generic` ロールが透過的に           | すべてのユーザー                                      |
| 1.3 で `<aside>` の条件付きロールマッピング | すべてのユーザー                                      |
| 1.3 で `image` / `img` ロールが同義に       | すべてのユーザー                                      |
| `wai-aria` オプションのリネーム             | 設定に `checkingRequiredOwnedElements` があるユーザー |

## ARIA バージョンの設定

デフォルトの ARIA バージョンは `"1.3"` になりました。以前の動作が必要な場合は、`ruleCommonSettings` で `ariaVersion` をグローバルに設定します。このプロパティの詳細は[設定の移行ガイド](/docs/migration/v4-to-v5/config)を参照してください。

```json
{
  "ruleCommonSettings": {
    "ariaVersion": "1.2"
  }
}
```

ルールごとに設定することもできます:

```json
{
  "rules": {
    "wai-aria": {
      "options": {
        "version": "1.2"
      }
    }
  }
}
```

:::note
デフォルトは `"1.3"` です。ARIA 1.2 の動作が必要な場合のみ設定を変更してください。
:::

## Generic ロールの透過性（ARIA 1.3）

ARIA 1.3 で最も重要な変更です。`generic` ロールを持つ要素（素の `<div>` や `<span>` を含む）がアクセシビリティツリーの走査で**透過的**になります。

### 変更前（ARIA 1.2）

`<ul>` と `<li>` の間に `<div>` を挟むと、親子ロールの関係が壊れていました:

```html
<!-- ARIA 1.2: エラー -- <div> が list > listitem の関係をブロック -->
<ul>
  <div>
    <li>item</li>
  </div>
</ul>
```

### 変更後（ARIA 1.3）

同じ HTML がパスします。ARIA 1.3 では `generic` または `none` ロールの要素を無視すると定義されています:

```html
<!-- ARIA 1.3: OK -- <div>（generic）は透過的 -->
<ul>
  <div>
    <li>item</li>
  </div>
</ul>
```

### バージョンによる動作の違い

| 動作                                       | `'1.1'` / `'1.2'` | `'1.3'` |
| ------------------------------------------ | ----------------- | ------- |
| `generic` が子ロールで透過的               | いいえ            | はい    |
| `generic` が親ロールで透過的               | いいえ            | はい    |
| `presentation` / `none` が子ロールで透過的 | はい              | はい    |
| `presentation` / `none` が親ロールで透過的 | いいえ            | はい    |

## `<aside>` の条件付きロールマッピング（ARIA 1.3）

`<aside>` 要素が ARIA 1.3 仕様に基づく**条件付きロールマッピング**を使用するようになりました:

- `<aside>` が `<article>`、`<aside>`、`<main>`、`<nav>`、`<section>` の**子孫でない**場合 → ロールは `complementary`
- `<aside>` がこれらのセクショニング要素の**子孫である**場合 → ロールは `generic`

`landmark-roles` ルールもこれに合わせて更新されました。`complementary` はトップレベルのランドマークとしてチェックされなくなりました。

:::caution
ARIA 1.3 がデフォルトになったため、この変更は全ユーザーに即座に影響します。セクショニング要素内で `<aside>` を使用している場合、リント結果が変わる可能性があります。
:::

## `image` / `img` ロールの同義語（ARIA 1.3）

ARIA 1.3 では `image` がプライマリロール名、`img` がシノニムになりました。いずれかが許可されるロールに含まれる場合、両方が受け入れられます:

```html
<!-- ARIA 1.2: 許可されるロールは "img" のみ -->
<!-- ARIA 1.3: "image" と "img" の両方が許可 -->
<img alt="photo" />
```

## ルールオプションのリネーム

`wai-aria` ルールのオプション `checkingRequiredOwnedElements` がリネームされました:

| v5（新）                                 | v4（非推奨）                    |
| ---------------------------------------- | ------------------------------- |
| `checkingAllowedAccessibilityChildRoles` | `checkingRequiredOwnedElements` |

:::tip
旧名もそのまま動作します。都合の良いタイミングで更新してください。
:::

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

## 用語の変更（カスタムルール作成者向け）

:::info カスタムルール作成者向け
このセクションは内部 API の変更を扱います。ARIA ルールの設定のみ行う場合はスキップできます。
:::

ARIA 1.3 でいくつかの内部概念がリネームされました。`ARIARole` 型は新旧両方のプロパティ名を公開しています:

| ARIA 1.3（新）                    | ARIA 1.2（非推奨）      |
| --------------------------------- | ----------------------- |
| `requiredAccessibilityParentRole` | `requiredContextRole`   |
| `allowedAccessibilityChildRoles`  | `requiredOwnedElements` |

両方のプロパティは同じ値を保持します。旧名は `@deprecated` エイリアスとして残されています。
