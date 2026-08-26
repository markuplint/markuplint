---
sidebar_position: 4
title: ARIA
---

# ARIA の変更

v5 では ARIA 1.3 のサポートが追加され、デフォルトの ARIA バージョンが 1.3 に変更されました。また `wai-aria` 傘ルールが削除され、21個の独立した後継ルールに置き換わりました。

## 変更点

| 変更内容                                        | 影響を受けるユーザー                                        |
| ----------------------------------------------- | ----------------------------------------------------------- |
| ARIA 1.3 サポートの追加（デフォルト）           | すべてのユーザー                                            |
| 1.3 で `generic` ロールが透過的に               | すべてのユーザー                                            |
| 1.3 で `<aside>` の条件付きロールマッピング     | すべてのユーザー                                            |
| 1.3 で `image` / `img` ロールが同義に           | すべてのユーザー                                            |
| 「No role permitted」が明示 `role` を厳密に禁止 | `<img>` などに `role="presentation"` 等を書いていたユーザー |
| `wai-aria` 傘ルールの削除                       | `wai-aria` を使っている設定すべて                           |
| `input-button-non-empty-value` の削除           | このルールを使っている設定                                  |
| すべての `wai-aria-*` ルールのリネーム          | これらのルールを直接指定している設定                        |

:::tip
ARIA に限らないカタログ全体のルール改名・分割は[改名と分割](/docs/migration/v4-to-v5/rules/rule-names)にまとまっています。
:::

## ARIA バージョンの設定

デフォルトの ARIA バージョンは `"1.3"` になりました。以前の動作が必要な場合は、`ruleCommonSettings` で `ariaVersion` をグローバルに設定します。このプロパティの詳細は[設定の移行ガイド](/docs/migration/v4-to-v5/config)を参照してください。

```json
{
  "ruleCommonSettings": {
    "ariaVersion": "1.2"
  }
}
```

ルールごとの `options.ariaVersion` による上書きを受け付けるのは `require-accessible-name` と `no-refer-to-non-existent-id` の2ルールだけです。

```json
{
  "rules": {
    "require-accessible-name": {
      "options": {
        "ariaVersion": "1.2"
      }
    }
  }
}
```

それ以外の ARIA ルール（旧 `wai-aria` 傘ルールの21個の後継）は `ruleCommonSettings.ariaVersion` のみを読みます。ルールごとのバージョンオプションを持たないため、v4 の `wai-aria` の `options.version` には移行先がありません。

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

## `<aside>` の条件付きロールマッピング（ARIA 1.3） {#aside-conditional-role-mapping-aria-13}

`<aside>` 要素が ARIA 1.3 仕様に基づく**条件付きロールマッピング**を使用するようになりました:

- `<aside>` が `<article>`、`<aside>`、`<main>`、`<nav>`、`<section>` の**子孫でない**場合 → ロールは `complementary`
- `<aside>` がこれらのセクショニング要素の**子孫である**場合 → ロールは `generic`

`landmark-roles` から分割された `no-nested-top-level-landmark` ルールは、この理由により `complementary` をトップレベルのランドマークとしてチェックしません。セレクターベースの検出では、降格した `<aside>` と本来の `<aside>` を区別できないため、チェックするとセクショニング要素配下の `<aside>` すべてで誤検知が出てしまいます。

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

## 傘ルールの削除 {#umbrella-rule-removed}

v4 の `wai-aria` は21個のチェックをまとめて実行する傘ルールで、各チェックは真偽値オプション（`checkingDeprecatedRole`、`disallowSetImplicitProps`、`checkingRequiredOwnedElements` など）で個別に切り替えられました。しかし v5.0.0 リリース前に、21検査のうち20件は独立したルールに分割済みでした（`no-abstract-role`、`no-unknown-role`、`require-owned-elements`、`no-focusable-in-aria-hidden` など）。両方が同時に有効な場合、`wai-aria` はそれらの仕事を二重に行っていただけでした。21件目は後述の新ルールです。

v5 では `wai-aria` を完全に削除し、それだけが消費していたオプショントグルの仕組みも削除しました。

`wai-aria: v` はそのまま動作します。markuplint が非推奨警告を報告し、設定を21個の後継ルール（上記の20個 + 新設の `no-aria-on-unsupported-element`）へ同じ severity・reason で展開します。

:::caution チェックごとのオプショントグルは失われます
移行先がありません。これらのルールは傘ルールから分割された時点でそれぞれ単一のチェックを無条件に実行するようになっており、どのルールのスキーマも `options` オブジェクトを受け付けません。

以前オプションで無効化していたチェックを無効のままにするには、該当するルール自体を無効化してください:

```json
{
  "rules": {
    "no-redundant-role": false
  }
}
```

これが、傘ルールの `disallowSetImplicitRole: false` で無効化していた v4 のパターンの置き換えです。
:::

### 新ルール: `no-aria-on-unsupported-element`

傘ルールの最初のチェック（仕様データが「ARIA 属性を一切サポートしない」とマークする要素に対する `role` / `aria-*` の禁止）は、v5 まで独立した後継ルールを持っていませんでした。これが `no-aria-on-unsupported-element` になりました。

### 削除: `input-button-non-empty-value` {#removed-input-button-non-empty-value}

このルールは「アクセシブルネームがない」ことの代理検出として `<input type="button" value="">` を検出していましたが、過剰検出（アクセシブルネームを持つ `aria-label` 付きのボタンも報告していた）と検出漏れ（同じく空のアクセシブルネームになる `value` 属性そのものの欠落を見逃していた）の両方を抱えていました。`require-accessible-name` がこのケースを正しくカバーしているため、v5 ではそちらに任せてルールを削除しました。

### `wai-aria-*` ルールのリネーム

`wai-aria-` プレフィックスを持つルールはすべてプレフィックスを外し、v5 の命名規則に合わせてリネームされました（`wai-aria-non-existent-role` → `no-unknown-role`、`wai-aria-required-owned-elements` → `require-owned-elements` など）。うち2つはさらに分割されています:

| 旧ルール                    | 分割後                                                                          |
| --------------------------- | ------------------------------------------------------------------------------- |
| `wai-aria-disallowed-props` | `no-prohibited-naming`、`element-supports-aria-prop`、`role-supports-aria-prop` |
| `wai-aria-implicit-props`   | `no-redundant-aria-prop`（`warning`）、`no-contradictory-aria-prop`（`error`）  |

ARIA に隣接する2ルールも分割されています:

- `landmark-roles` → `no-nested-top-level-landmark`（`ignoreRoles` 側）と `require-landmark-label`（`labelEachArea` 側）
- `required-h1` → `require-h1`（`<h1>` 欠落側）と `no-duplicate-h1`（`expected-once` 側）。どちらも既定が `warning` になりました。いずれのチェックも根拠として挙げられる WCAG 達成技法 H42 が非規範的であるためです。

旧名はすべて非推奨警告付きのエイリアス経由で v6 の削除まで動作します。対応表の全体は[改名と分割](/docs/migration/v4-to-v5/rules/rule-names)にあります。

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
