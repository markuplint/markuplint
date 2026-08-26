---
sidebar_position: 3
title: 設定
---

# 設定の変更

v5 ではグローバル設定、名前付きルール、よりシンプルなマージ動作が導入されました。多くの変更は設定をシンプルにします。`extends` を使っている場合、一部のマージ動作の変更は**破壊的**です。

## 変更一覧

| 変更内容                                         | 影響を受ける人                              |
| ------------------------------------------------ | ------------------------------------------- |
| 新しい `ruleCommonSettings` プロパティ           | すべての設定ファイル作成者                  |
| Named nodeRules                                  | プリセットのユーザーと作成者                |
| `specConformance` メタデータ                     | プリセット作成者                            |
| nodeRules/childNodeRules が名前で重複排除        | `extends` で named nodeRules を使う設定     |
| ルールの配列値が連結から上書きに変更             | `extends` で配列値を使う設定                |
| ルール options が shallow merge に変更           | `extends` でネストされた options を使う設定 |
| Pretender の `data` が上書きから追加に変更       | `extends` で pretenders を使う設定          |
| Pretender が標準 HTML 要素には適用されなくなった | `pretenders` で HTML 要素を指定している設定 |
| `--config` フラグが指定ファイルのみ読み込み      | `--config` を使う CLI ユーザー              |

## `ruleCommonSettings`

すべてのルールに共通するオプションを一箇所で設定できます。現在は `ariaVersion` をサポートしています。

:::tip 新機能
ARIA 関連ルールごとに `ariaVersion` を繰り返し設定する必要がなくなりました。
:::

**変更前 (v4):** 各ルールに個別に ARIA バージョンを指定する必要がありました。

```json
{
  "rules": {
    "wai-aria": {
      "options": {
        "version": "1.2"
      }
    },
    "require-accessible-name": {
      "options": {
        "ariaVersion": "1.2"
      }
    },
    "no-refer-to-non-existent-id": {
      "options": {
        "ariaVersion": "1.2"
      }
    }
  }
}
```

**変更後 (v5):** 一度設定すれば、すべての ARIA 関連ルールがフォールバックとして使用します。

```json
{
  "ruleCommonSettings": {
    "ariaVersion": "1.2"
  },
  "rules": {
    "require-accessible-name": true,
    "no-refer-to-non-existent-id": true
  }
}
```

:::note
`wai-aria` 自体は v5 で削除されました。21個のチェックはそれぞれ独立したルールになり、いずれも `ruleCommonSettings.ariaVersion` のみを読みます。[ARIA の変更](/docs/migration/v4-to-v5/aria#umbrella-rule-removed)を参照してください。
:::

### 解決優先度

ルールは以下の順序で ARIA バージョンを解決します（優先度の高い順）:

1. **ルールレベルのオプション** -- `options.ariaVersion`。受け付けるのは `require-accessible-name` と `no-refer-to-non-existent-id` の2ルールのみ
2. **`ruleCommonSettings.ariaVersion`** -- グローバルフォールバック
3. **ビルトインデフォルト** -- Markuplint に組み込まれた推奨 ARIA バージョン

この2ルールについては、グローバル設定をオーバーライドできます:

```json
{
  "ruleCommonSettings": {
    "ariaVersion": "1.2"
  },
  "rules": {
    "require-accessible-name": {
      "options": {
        "ariaVersion": "1.3"
      }
    }
  }
}
```

v4 の `wai-aria` の `options.version` には後継がありません。傘ルールから分割されたルールは `options` オブジェクトを一切受け付けません。

:::info
v5 では ARIA バージョンとして `"1.3"` も指定可能になり、デフォルトになりました。詳細は [ARIA 移行ガイド](/docs/migration/v4-to-v5/aria)を参照してください。
:::

### カスタムルール作成者向け

:::info カスタムルール作成者向け
このセクションはカスタムルール作成者専用です。既存ルールの設定のみ行う場合はスキップできます。
:::

カスタムルールで ARIA バージョンを参照している場合、フォールバックチェーンを更新してください:

```ts
// v4
const ariaVersion = el.rule.options.ariaVersion;

// v5
import { ARIA_RECOMMENDED_VERSION } from '@markuplint/ml-spec';

const ariaVersion =
  el.rule.options?.ariaVersion ?? document.ruleCommonSettings?.ariaVersion ?? ARIA_RECOMMENDED_VERSION;
```

`document.ruleCommonSettings` はルールの `verify()` コールバックに渡される `MLDocument` インスタンスで利用可能です。

## Named nodeRules

プリセットが**名前付き nodeRules** を定義できるようになりました。名前付き nodeRule は独立して制御できるルールを作成します。ベースルールに影響を与えずに、有効化・無効化・再設定が可能です。

:::tip 新機能
名前付きルールを使えば、ベースルール全体を無効化せずに特定のプリセットチェック（`a11y/img-alt` など）を無効化できます。
:::

### プリセットでの名前付きルールの使い方

`markuplint:recommended` などのビルトインプリセットは、`a11y/img-alt` や `a11y/form-label` といった名前付き nodeRules を定義しています。各名前付きルールには名前空間（`a11y/`）と説明的な名前があります。

### 特定の名前付きルールを無効化

ベースルールを有効に保ちつつ、特定のチェックだけを無効化:

```json
{
  "extends": ["markuplint:recommended"],
  "rules": {
    "a11y/img-alt": false
  }
}
```

これは `a11y/img-alt` チェックのみを無効化します。`require-attr` ベースルールは他のコンテキストで引き続き動作します。

### 名前空間全体を無効化

ワイルドカードを使って名前空間内のすべての名前付きルールを無効化:

```json
{
  "extends": ["markuplint:recommended"],
  "rules": {
    "a11y/*": false
  }
}
```

これは `a11y/img-alt`、`a11y/form-label` など、すべての `a11y/` 名前付きルールを無効化します。`html-standard/` など他の名前空間のルールには影響しません。

### 名前付きルールの重大度を変更

名前付きルールをエラーから警告にダウングレード:

```json
{
  "extends": ["markuplint:recommended"],
  "rules": {
    "a11y/img-alt": {
      "severity": "warning"
    }
  }
}
```

### 無効化パターンのまとめ

| パターン                | 効果                                                     |
| ----------------------- | -------------------------------------------------------- |
| `"a11y/img-alt": false` | 特定の名前付きルールを1つ無効化                          |
| `"a11y/*": false`       | `a11y/` 名前空間のすべての名前付きルールを無効化         |
| `"groupName": false`    | マルチエントリグループ内のすべての名前付きルールを無効化 |

## `specConformance` メタデータ

名前付き nodeRules に `specConformance` アノテーションを付与できます。RFC 2119 キーワードに基づいて、チェックを normative（規範的）か non-normative（非規範的）に分類します。

| 値                | 意味         | RFC 2119 キーワード      |
| ----------------- | ------------ | ------------------------ |
| `"normative"`     | 厳格な要件   | MUST, SHALL, REQUIRED    |
| `"non-normative"` | 推奨事項     | SHOULD, MAY, RECOMMENDED |
| _（未設定）_      | 仕様分類なし | --                       |

:::note
`specConformance` はメタデータのみです。違反出力に含まれますが、重大度を自動的に変更する機能は**ありません**。重大度の制御には `severity` フィールドを使用してください。
:::

### 違反における名前付きルールの表示

名前付きルールが違反を検出すると、2つの識別子が表示されます:

| フィールド | 値                                               | 用途                                       |
| ---------- | ------------------------------------------------ | ------------------------------------------ |
| `ruleId`   | ベースルール名（例: `require-attr`）             | 常に存在。プログラム的なフィルタリング用。 |
| `name`     | 名前付きルールのエイリアス（例: `a11y/img-alt`） | 名前付きルールの場合のみ存在。表示名。     |

CLI は名前付きルールのエイリアスを表示名として使用します。

## nodeRules/childNodeRules のマージ動作

v5 では `extends` 使用時の `nodeRules` と `childNodeRules` のマージ方法が変更されました。

**変更前 (v4):** 両配列は単純に連結され、重複が蓄積していました。

**変更後 (v5):** 名前付きエントリ（`name` プロパティを持つもの）は名前で重複排除されます。子設定のエントリが、同名の親設定のエントリを置き換えます。無名エントリは従来通り追加されます。

```jsonc
// 親プリセットが a11y/img-alt を定義
{
  "nodeRules": [
    { "name": "a11y/img-alt", "selector": "img", "rules": { "require-attr": { "value": "alt" } } }
  ]
}

// あなたの設定が a11y/img-alt を再定義
{
  "nodeRules": [
    { "name": "a11y/img-alt", "selector": "img", "rules": { "require-attr": { "value": ["alt", "aria-label"] } } }
  ]
}

// 結果: あなたの定義がプリセット版を置き換え（名前で重複排除）
```

:::note
無名の nodeRules エントリ（`name` を持たないもの）は v4 と同様、常に追加されます。
:::

## ルールの配列値: 連結から上書きに変更

:::caution 破壊的変更
`extends` を通じた配列の連結に依存している場合、設定の更新が必要です。
:::

**変更前 (v4):** 設定をマージする際、配列値は連結されていました。

```json
// ベース設定
{ "rules": { "disallowed-element": ["div", "span"] } }
// オーバーライド設定
{ "rules": { "disallowed-element": ["section", "article"] } }
// v4 の結果: ["div", "span", "section", "article"]
```

**変更後 (v5):** オーバーライドが配列全体を置き換えます。ESLint や Biome と同じ動作です。

```json
// v5 の結果: ["section", "article"]
```

**移行方法:** 値を1つの設定内で手動で統合してください。なお `disallowed-element` は v5 で `no-restricted-element` にリネームされています（[改名と分割](/docs/migration/v4-to-v5/rules/rule-names)参照）:

```json
{ "rules": { "no-restricted-element": ["div", "span", "section", "article"] } }
```

## ルール options: deep merge から shallow merge に変更

:::caution 破壊的変更
`extends` を通じたネストされたオプションオブジェクトの deep merge に依存している場合、設定の更新が必要です。
:::

**変更前 (v4):** ネストされたオプションオブジェクトは deep merge されていました。両方の設定のプロパティが保持されていました。

```json
// ベース設定
{ "rules": { "my-rule": { "options": { "nested": { "a": 1, "b": 2 } } } } }
// オーバーライド設定
{ "rules": { "my-rule": { "options": { "nested": { "b": 3 } } } } }
// v4 の結果: { "nested": { "a": 1, "b": 3 } }
```

**変更後 (v5):** ネストされたオブジェクトは完全に置き換えられます。トップレベルのオプションキーのみマージされます。

```json
// v5 の結果: { "nested": { "b": 3 } }
// 注意: "nested" オブジェクト全体が置き換えられたため、"a" は消失
```

**移行方法:** オーバーライド側で完全なオブジェクトを指定してください:

```json
{ "rules": { "my-rule": { "options": { "nested": { "a": 1, "b": 3 } } } } }
```

## Pretender `data`: 上書きから追加に変更

:::tip 改善
この変更により pretender 設定の合成がしやすくなりました。
:::

**変更前 (v4):** pretender 設定の `data` 配列は上書きされていました（右辺優先）。

**変更後 (v5):** `data` 配列は追加（連結）されるようになりました。`files` と `imports` は引き続き上書きされます。

| プロパティ | v4 の動作 | v5 の動作 |
| ---------- | --------- | --------- |
| `files`    | 上書き    | 上書き    |
| `imports`  | 上書き    | 上書き    |
| `data`     | 上書き    | **追加**  |

**移行方法:** これは一般的に非破壊的な改善です。pretender データを完全に置き換える必要がある場合は、`extends` を使わず単一の設定ですべての pretenders を定義してください。

## Pretender が標準 HTML 要素には適用されなくなった

:::caution 破壊的変更
`pretenders`（またはインライン `as=` 属性）で標準 HTML 要素を別の要素として振る舞わせていた場合、それらのエントリは無視されるようになりました。
:::

**理由:** セレクタが認識可能な HTML / SVG 要素にマッチする pretender エントリは、deprecation 警告・ARIA role 制約・ブラウザサポートチェックといった元タグに紐づく仕様ベースのルールを暗黙に隠してしまっていました。pretender はもともと custom component 専用の仕組みとして設計されており、v5 でその制約を実装に反映しました。詳細は [issue #3740](https://github.com/markuplint/markuplint/issues/3740) を参照してください。

**変更前 (v4):** `<marquee as="div">` や `pretenders: [{ selector: 'marquee', as: 'div' }]` で marquee 要素を div として振る舞わせ、deprecation 警告を抑制できていました。

```json
{
  "pretenders": [{ "selector": "marquee", "as": "div" }]
}
```

**変更後 (v5):** pretender は元の要素が custom component の場合のみ適用されます。具体的には、`@markuplint/html-spec`（またはユーザー指定の spec）に登録された要素**以外**が対象です。

| 元の要素                                                                               | pretender が適用される?               |
| -------------------------------------------------------------------------------------- | ------------------------------------- |
| 標準 HTML / SVG タグ（`<button>`, `<marquee>` など）                                   | いいえ                                |
| Web component / autonomous custom element（`<x-foo>`）                                 | はい                                  |
| Authored component（JSX/Vue/Svelte の `<MyButton>` など）                              | はい                                  |
| HTML パーサーがハイフンなしで読み取った未登録名（`<SimpleButton>` → `<simplebutton>`） | はい — `pretenders.scan` のために維持 |

**移行方法:**

1. 設定ファイルを検索し、`pretenders` の `selector` が HTML / SVG 要素名にマッチしているエントリを削除してください。元要素はそのまま検査されます。
2. テンプレート上のインライン `<HTMLElement as="…">` は v4 でも no-op だったため、挙動は変わりません。
3. 標準タグの違反を意図的に黙らせていた場合（例: `<marquee>` を警告なしで使い続けたい）、pretender ではなく該当ルールの `disabled` 設定や `severity` / `ignore` で対応してください。

## `--config` フラグの動作

:::caution 破壊的変更
`--config` でプロジェクトの自動検出される設定とのマージに依存している場合、更新が必要です。
:::

**変更前 (v4):** `--config` を使うと、指定ファイルと `.markuplintrc` の両方が読み込まれてマージされていました。

```bash
# v4: custom.json と .markuplintrc の両方が読み込まれてマージ
markuplint --config custom.json index.html
```

**変更後 (v5):** `--config` を使うと、指定ファイルのみが読み込まれます。自動検出は行われません。

```bash
# v5: custom.json のみ読み込まれ、.markuplintrc は無視
markuplint --config custom.json index.html
```

**移行方法:** 設定ファイル内で `extends` を使ってプロジェクトの設定を含めてください:

```json
{
  "extends": ["./.markuplintrc"],
  "rules": {
    "your-custom-rule": true
  }
}
```

CLI フラグの変更の詳細は [CLI 移行ガイド](/docs/migration/v4-to-v5/cli)を参照してください。

## `:closest()` セレクタの非推奨

:::caution 非推奨
`:closest()` は v6 で削除されます。今のうちに移行してください。
:::

拡張擬似クラス `:closest()` は非推奨です。標準の `:is()` 擬似クラスと子孫結合子で同じ結果が得られるため、冗長です。

**変更前:**

```json
{
  "nodeRules": [
    {
      "selector": "div:closest(nav)",
      "rules": { "class-naming": "/^nav-/" }
    }
  ]
}
```

**変更後:**

```json
{
  "nodeRules": [
    {
      "selector": "div:is(nav *)",
      "rules": { "class-naming": "/^nav-/" }
    }
  ]
}
```

| 変更前                              | 変更後                        |
| ----------------------------------- | ----------------------------- |
| `:closest(nav)`                     | `:is(nav *)`                  |
| `:closest(.wrapper)`                | `:is(.wrapper *)`             |
| `div:closest(nav):closest(section)` | `div:is(nav *):is(section *)` |
