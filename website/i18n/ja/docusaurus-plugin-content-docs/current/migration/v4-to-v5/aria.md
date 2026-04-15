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

`tablist` と `tab` の間に `<div>` ラッパーを挟むと、親子ロールの関係が壊れていました:

```html
<!-- ARIA 1.2: エラー -- <div> が tablist > tab の関係をブロック -->
<div role="tablist">
  <div class="wrapper">
    <button role="tab">Tab 1</button>
  </div>
</div>
```

### 変更後（ARIA 1.3）

同じ HTML がパスします。ARIA 1.3 では `generic` または `none` ロールの要素を無視すると定義されています:

```html
<!-- ARIA 1.3: OK -- <div>（generic）は透過的 -->
<div role="tablist">
  <div class="wrapper">
    <button role="tab">Tab 1</button>
  </div>
</div>
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

## 「No role permitted」の厳密適用

[ARIA in HTML](https://w3c.github.io/html-aria/) で要素の状態が「No role permitted（明示 role 禁止）」と規定されている場合、v5 では暗黙ロールに一致する値であっても明示的な `role` 属性を一切許可しません。v4 では暗黙ロールに一致する値は黙って通していました。

代表的な影響例:

```html
<!-- ❌ v5 ではエラー — 暗黙ロールは `presentation` だが明示 role は禁止 -->
<img src="spacer.png" alt="" role="presentation" />
<img src="spacer.png" alt="" role="none" />
```

同じ規則で新たに対象となる主な要素（暗黙ロールに一致する明示 role を書いていた場合）:

| パターン                                                                   | 暗黙ロール | 対応          |
| -------------------------------------------------------------------------- | ---------- | ------------- |
| `<img>`（`alt` なし・他のアクセシブル名なし）+ 任意の role                 | `img`      | `role` を削除 |
| `<area href="...">` + 任意の role                                          | `link`     | `role` を削除 |
| `<figure><figcaption>...</figcaption></figure>` + `<figure>` に任意の role | `figure`   | `role` を削除 |
| `<tr>`（`<table>` / `[role=table\|grid\|treegrid]` 配下）+ 任意の role     | `row`      | `role` を削除 |
| `<html role="document">`（ARIA 1.1）                                       | `document` | `role` を削除 |
| `<meter>` + 任意の role                                                    | `meter`    | `role` を削除 |
| `<input type="email\|number\|password\|...">` + 暗黙ロールに一致する role  | （様々）   | `role` を削除 |

**マイグレーション:** 該当する `role` 属性を削除してください。HTML-AAM 由来の暗黙ロールは引き続き適用されるため、アクセシビリティ挙動は維持されます。

背景は Issue [#3641](https://github.com/markuplint/markuplint/issues/3641) を参照してください。

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
