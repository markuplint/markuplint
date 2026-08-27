---
sidebar_position: 4
title: 'ARIA'
---

# ARIA

v5 は ARIA 1.3 を追加し、既定にします（v4 は 1.2）。v4 の `wai-aria` は 21 の独立ルールになります。

## 何が変わったか

| 変更                                | 影響                                                     |
| ----------------------------------- | -------------------------------------------------------- |
| 既定 ARIA `"1.3"`                   | 全員                                                     |
| 1.3 で `generic` が透過             | 必須の親子ロールを `<div>` / `<span>` で包むマークアップ |
| 1.3 の `<aside>` 条件付き暗黙ロール | 入れ子の `<aside>`                                       |
| 1.3 の `image` / `img` 同義         | `img` を許可する要素の `role="image"`                    |
| 「ロール禁止」が厳密                | 暗黙ロールと同じ明示 `role`                              |
| ルール名 `wai-aria` の削除          | `wai-aria` を書いた設定                                  |

共有バージョンは [設定](/docs/migration/v4-to-v5/config#rulecommonsettings)。カタログは [改名と分割](/docs/migration/v4-to-v5/rules/rule-names)。

## ARIA バージョン

既定は `"1.3"`。1.2 のままにするには:

```json
{
  "ruleCommonSettings": {
    "ariaVersion": "1.2"
  }
}
```

ルール単位の `options.ariaVersion` が残るのは `require-accessible-name` と `no-refer-to-non-existent-id` だけです。21 後継は **options を持ちません。** v4 の `wai-aria` `options.version` は `ruleCommonSettings.ariaVersion` へ移します。

## `generic` の透過（ARIA 1.3）

暗黙・明示の `generic`（素の `<div>` / `<span>`）は、必須の親・所有子の探索でスキップされます。

```html
<!-- ARIA 1.2: list → listitem が失敗。ARIA 1.3: 通る。 -->
<ul>
  <div>
    <li>item</li>
  </div>
</ul>
```

| 振る舞い                                      | `1.1` / `1.2` | `1.3` |
| --------------------------------------------- | ------------- | ----- |
| 子ロール探索で `generic` が透過               | いいえ        | はい  |
| 親ロール探索で `generic` が透過               | いいえ        | はい  |
| 子ロール探索で `presentation` / `none` が透過 | はい          | はい  |
| 親ロール探索で `presentation` / `none` が透過 | はい          | はい  |

## `<aside>` の条件付きロール（ARIA 1.3）

- `<article>`、`<aside>`、`<blockquote>`、`<details>`、`<dialog>`、`<fieldset>`、`<figure>`、`<nav>`、`<section>`、`<td>` の子孫でない → `complementary`
- それらの子孫 → `generic`。ただしアクセシブルネームがあれば `complementary` のまま

`no-nested-top-level-landmark` は `complementary` をトップレベルランドマークとして扱いません（セレクタでは降格した `<aside>` と本物を区別できないため）。

## `image` / `img` 同義（ARIA 1.3）

許可ロールに `img` があるとき `image` も受け付けます（`<embed>`、`<iframe>`）。`<img>` はもともと暗黙 `img` です。

## 「ロール禁止」が厳密

[ARIA in HTML](https://w3c.github.io/html-aria/) がロール禁止とするとき、v5 は暗黙ロールと同じ値でも明示 `role` を禁止します。v4 は一致を許していました。属性を外してください。暗黙ロールは残ります。[issue #3641](https://github.com/markuplint/markuplint/issues/3641)。

## `wai-aria` 傘ルール {#傘ルールの削除}

v4 では `wai-aria` が複数検査を行い、一部は boolean オプションで切れていました。

`wai-aria: true` は v6 まで動きます。非推奨警告のあと、同じ severity/reason で 21 ルールに展開します。**オプションのトグルは引き継ぎません。** 切るならそのルールを無効化します。

### v4 オプション → v5 ルール

| v4 オプション                    | v4 既定 | v5 ルール                                                |
| -------------------------------- | ------- | -------------------------------------------------------- |
| `checkingValue`                  | `true`  | `no-invalid-aria-prop-value`                             |
| `checkingDeprecatedRole`         | `true`  | `no-deprecated-role`                                     |
| `checkingDeprecatedProps`        | `true`  | `no-deprecated-aria-prop`                                |
| `permittedAriaRoles`             | `true`  | `permitted-roles`                                        |
| `checkingRequiredOwnedElements`  | `true`  | `require-owned-elements`                                 |
| `checkingPresentationalChildren` | `false` | `no-aria-on-presentational-children`                     |
| `checkingInteractionInHidden`    | `false` | `no-focusable-in-aria-hidden`                            |
| `disallowSetImplicitRole`        | `true`  | `no-redundant-role`                                      |
| `disallowSetImplicitProps`       | `true`  | `no-redundant-aria-prop` と `no-contradictory-aria-prop` |
| `disallowDefaultValue`           | `false` | `no-default-aria-value`                                  |
| `version`                        | `"1.2"` | `ruleCommonSettings.ariaVersion`                         |

v4 で常時（トグルなし）: `#ARIAAttrs: false` → `no-aria-on-unsupported-element`；未知・抽象ロール；必須 ARIA プロパティ；不許可プロパティ（`no-prohibited-naming`、`element-supports-aria-prop`、`role-supports-aria-prop`）；ロール無しのグローバルプロパティ → `aria-prop-requires-role`。

v4 の `wai-aria` は `require-parent-role` と `tab-requires-tabpanel` を実装していません。エイリアスと `markuplint:a11y` では有効になります。

### v4 既定より増える報告

トグルを捨てるため、`wai-aria: true`（および `markuplint:a11y`）では次も動きます。

- `no-aria-on-presentational-children`（v4 既定オフ）
- `no-focusable-in-aria-hidden`（v4 既定オフ）
- `no-default-aria-value`（v4 既定オフ）
- `require-parent-role`（新規）
- `tab-requires-tabpanel`（新規）

個別に `false` にするか、`a11y/wai-aria/*` のグループ名で切ってください。

`landmark-roles` と `required-h1` の分割は `wai-aria` エイリアスではなく [改名と分割](/docs/migration/v4-to-v5/rules/rule-names) です。

## 用語（カスタムルール作者）

`ARIARole` 上の ARIA 1.3 名（旧名は `@deprecated` エイリアス）:

| ARIA 1.3                          | 旧                      |
| --------------------------------- | ----------------------- |
| `requiredAccessibilityParentRole` | `requiredContextRole`   |
| `allowedAccessibilityChildRoles`  | `requiredOwnedElements` |
