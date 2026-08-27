---
sidebar_position: 0
title: 改名と分割
---

# ルールの改名・分割

これは、実際の v4 由来を持つ全てのルール名変更のマスター参照です。`wai-aria` 傘ルール（v5 のプレリリース開発全体を通じて段階的に分割された特殊なケース）は [ARIA の変更](/docs/migration/v4-to-v5/aria) を、v4 に前身を持たないルールは [v5 での新規追加](#new-in-v5-no-v4-equivalent) を、改名・分割そのものを超えるオプション形式変更を持つルールについては、このセクションの個別ページを参照してください。

v5.0.0 ではルールカタログを全面的に見直しました。一貫した動詞 prefix 命名、独立した仕様要求ごとに1ルール、そして機械可読な仕様準拠性メタデータです。**v4 の38ルールが v5.0.0 で106ルールになります。** その内訳は: 12ルールが単純にリネームされ、10ルールが複数に分割され（invalid-attr、doctype、character-reference、deprecated-attr、deprecated-element、landmark-roles、no-refer-to-non-existent-id、permitted-contents、required-h1、table-row-column-alignment）、`wai-aria` 傘ルールが21個の独立したルールになり（[ARIA の変更](/docs/migration/v4-to-v5/aria#umbrella-rule-removed)参照）、1ルールが完全に削除され（[削除](#deletions)参照）、残りは v4 に前身のない完全新規機能か、v5 の alpha/rc 開発中に一度リネームされ、今回さらにもう一度リネームされたルールです（[v5 での新規追加](#new-in-v5-no-v4-equivalent)参照）。

:::caution スコープに関する注記
markuplint の v5 開発は、今回の最終的な作業に至るまで多くの alpha/rc リリースを経てきました。以下のルール名の一部（および [v5 での新規追加](#new-in-v5-no-v4-equivalent) 配下のもの）は、安定版 v4 には一度も存在しませんでした — それらはこの中間期間中に導入され、時にはすでに一度リネームされたものです。
:::

:::tip 何も静かに壊れません — ただし1件だけ例外があります
改名・分割された全てのルールは旧名でも引き続き動作します。markuplint が非推奨警告を報告し、旧設定を新しいルールに自動的に展開します。旧名は v6 で削除されます。

例外: 2つのルールは v5 以前の名前をそのまま保持しつつ、それを知らせるエイリアスを持たない分割先を新たに獲得します。生設定（プリセットを使わない設定）で `permitted-contents` や `no-refer-to-non-existent-id` を直接使っている場合は[既知の移行ギャップ](#known-migration-gap)を参照してください。
:::

## カテゴリ

v4 の5分類（`validation`、`a11y`、`naming-convention`、`maintainability`、`style`）は、各ルールの `meta.ts` の `category` フィールドが持つ9分類に置き換えられました。`validation`（一覧性が悪いほど粗い分類で、v4 のルールの中でも最大のシェアを占めていた）はルールが実際に検査する内容で細分化され、`naming-convention`（1ルール、`class-naming`）は `style` に統合されました。

| カテゴリ          | カバーする内容                                                                               |
| ----------------- | -------------------------------------------------------------------------------------------- |
| `syntax`          | パースレベルの適合性 — 不正なマークアップ、文字参照、トークンレベルのタグ・要素構造          |
| `structure`       | 文書・コンテンツモデルの構造 — 許可されるコンテンツ、祖先・子孫制約、doctype、テーブルモデル |
| `attributes`      | 属性名・値の適合性 — 未知/不許可の属性、値の型検査、srcset、寸法                             |
| `references`      | 相互参照の整合性 — ID参照、`for`/`form`/`list`/`usemap` 属性の参照先                         |
| `forms`           | フォームコントロール固有のベストプラクティス                                                 |
| `a11y`            | ARIA およびその他のアクセシビリティ固有の検査                                                |
| `style`           | 唯一の正解が無い、好みが分かれる書式・命名の選好                                             |
| `maintainability` | 仕様準拠性やアクセシビリティに無関係な、プロジェクトの健全性に関する検査                     |
| `compat`          | ブラウザ・エンジンの互換性 — browserslist × BCD、実験的/非標準機能フラグ                     |

カテゴリは[ルール一覧](/docs/rules)を閲覧するための分類であり、設定ファイルには現れません。移行作業として手を動かす必要はありません。

## 1:1 リネーム

以下の12ルールは、実在する安定版 v4 でこの名前のまま存在し、単純にリネームされたものです:

| 旧名（v4）                  | 新名                       |
| --------------------------- | -------------------------- |
| `attr-duplication`          | `no-duplicate-attr`        |
| `id-duplication`            | `no-duplicate-id`          |
| `required-attr`             | `require-attr`             |
| `required-element`          | `require-element`          |
| `ineffective-attr`          | `no-ineffective-attr`      |
| `end-tag`                   | `require-end-tag`          |
| `disallowed-element`        | `no-restricted-element`    |
| `heading-levels`            | `no-skipped-heading-level` |
| `neighbor-popovers`         | `require-adjacent-popover` |
| `no-hard-code-id`           | `no-hardcoded-id`          |
| `no-use-event-handler-attr` | `no-event-handler-attr`    |
| `use-list`                  | `no-pseudo-list`           |

`required-attr` → `require-attr` はスコープを維持した単純なリネームです — [責務の縮小](#scope-narrowed)を参照してください。

:::note `wai-aria` は別扱いです
ここに載っていそうな `wai-aria-*` という旧名（例: `wai-aria-abstract-role` → `no-abstract-role`）は、**v4 のリネームではありません** — 安定版 v4 に `wai-aria-abstract-role` という名前のルールが存在したことは一度もありません。この名前は、v5 自身の alpha/rc 開発中、単一の v4 ルール `wai-aria` が最初に20個に分割された際に一時的に存在しただけで、今回の最終再設計でさらにもう一度、各ピースがリネームされています。実際の v4 設定から移行する場合、手元にあるルールは `wai-aria` そのものであり、その移行経路 — 設定変更なしに最終的な21ルール全てに展開される単一の `wai-aria: v` エイリアス — は [ARIA の変更](/docs/migration/v4-to-v5/aria#umbrella-rule-removed) に完全にまとめてあります。上記の `wai-aria-*` という名前が必要になるのは、v5 の中間プレリリースを既に導入し、分割後のルールのいずれかを直接設定していた場合だけです。
:::

## 分割

各分割の検査は独立した仕様要求に対応しており、個別に有効化・無効化・severity 設定ができます。以下の10個の旧名は、いずれも実在する安定版 v4 に存在していました。

| 旧名（v4）                    | 分割後                             | 検査内容                                                                                                                              |
| ----------------------------- | ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `invalid-attr`                | `no-unknown-attr`                  | 仕様に定義のない属性名（typo 候補・大文字小文字不一致）                                                                               |
|                               | `no-disallowed-attr`               | 定義はあるがこの文脈では許可されない属性: `noUse`、条件付き許可の条件外、autonomous custom element 上の `is`                          |
|                               | `no-invalid-attr-value`            | 属性値の型・文法違反                                                                                                                  |
|                               | `no-restricted-attr`               | ユーザー定義の `disallowAttrs` 拒否リスト — このルールの唯一のオプション                                                              |
| `doctype`                     | `require-doctype`                  | DOCTYPE 宣言の完全な欠落                                                                                                              |
|                               | `no-obsolete-doctype`              | public/system 識別子付きの旧型 DOCTYPE（`about:legacy-compat` は仕様通り許容）                                                        |
| `character-reference`         | `no-malformed-character-reference` | parse5 の不正文字参照 parse error                                                                                                     |
|                               | `no-unescaped-char`                | 未エスケープの生 `<` またはあいまいな `&`（デフォルト）。`strict` オプションで `>`・`"`・全ての生 `&` も対象に追加                    |
| `deprecated-attr`             | `no-obsolete-attr`                 | HTML LS §16.2 の廃止属性（適合性違反、`error`）                                                                                       |
|                               | `no-deprecated-attr`               | 仕様上は valid だが MDN/BCD が非推奨とマークする属性（`warning`）                                                                     |
| `deprecated-element`          | `no-obsolete-element`              | 同上（要素、`error`）                                                                                                                 |
|                               | `no-deprecated-element`            | 同上（要素、`warning`）                                                                                                               |
| `landmark-roles`              | `no-nested-top-level-landmark`     | `banner`/`main`/`contentinfo` が他のランドマーク内に入れ子                                                                            |
|                               | `require-landmark-label`           | 同一ランドマークロールが複数ある場合のアクセシブルネーム欠落                                                                          |
| `no-refer-to-non-existent-id` | `no-refer-to-non-existent-id`      | `DOMID` 型属性・ARIA ID reference 型プロパティの参照先 ID 不在（ルールは名前を維持 — [既知の移行ギャップ](#known-migration-gap)参照） |
|                               | `no-broken-fragment-link`          | `a[href]`/`area[href]` のフラグメント参照先 ID 不在（`fragmentRefersNameAttr` オプションはこちらに移動）                              |
| `permitted-contents`          | `permitted-contents`               | 子ノードのコンテンツモデル適合（ルールは名前を維持 — [既知の移行ギャップ](#known-migration-gap)参照）                                 |
|                               | `no-disallowed-ancestor`           | 禁止祖先の子孫として出現（仕様の `forbiddenAncestors`）                                                                               |
|                               | `require-ancestor`                 | 必須祖先の欠落（仕様の `descendantOf`）                                                                                               |
|                               | `no-duplicate-sibling-attr`        | 兄弟間で一意であるべき属性の重複（例: `track[default]`）                                                                              |
| `required-h1`                 | `require-h1`                       | `<h1>` の欠落                                                                                                                         |
|                               | `no-duplicate-h1`                  | `<h1>` の重複                                                                                                                         |
| `table-row-column-alignment`  | `no-table-cell-overlap`            | `rowspan`/`colspan` によるセル重複（table model error）                                                                               |
|                               | `no-table-span-overflow`           | span の行グループ・表境界超過（table model error）                                                                                    |
|                               | `no-empty-table-track`             | どのセルも開始しない行・列（table model error）                                                                                       |
|                               | `consistent-table-row-length`      | 行ごとの列数不揃い（仕様は許容、4つのうち唯一 `warning` レベル）                                                                      |

:::note もう2つの分割には v4 の前身がありません
`wai-aria-disallowed-props`（→ `no-prohibited-naming`/`element-supports-aria-prop`/`role-supports-aria-prop`）と `wai-aria-implicit-props`（→ `no-redundant-aria-prop`/`no-contradictory-aria-prop`）は、一見 v4 ルールの分割に見えますが、どちらの名前も実在する v4 には存在しませんでした。どちらも `wai-aria` 傘ルールの、より早い段階でのプレリリース分割の一部でした。これらを含む `wai-aria` → 21ルールの完全な経緯は [ARIA の変更](/docs/migration/v4-to-v5/aria#umbrella-rule-removed) を、同種の「分割に見えるが v4 の前身がない」もう3件（`no-unsupported-features`・`script-content`・`srcset-sizes-constraint`）は [v5 での新規追加](#new-in-v5-no-v4-equivalent) を参照してください。
:::

### オプションで振り分けられる分割: Before / After {#option-routed-splits-before--after}

上記の分割の多くは無条件 — 旧オプションの値にかかわらず、旧検査ごとに新ルールが必ず割り当てられます。例外は5件: `doctype`、`landmark-roles`、`required-h1`、`no-unsupported-features`、`invalid-attr` は、旧オプションの内容に応じて新しい姉妹ルールの一部だけを有効化します。

:::note
エイリアス機構がこの展開を（非推奨警告付きで）自動的に行うため、以下は手動で設定を書き換える場合にのみ関係します。（`no-unsupported-features` は [v5 での新規追加](#new-in-v5-no-v4-equivalent) に含まれる、v4 に前身のないルールです — 下記の例は v5 のプレリリース期間中に既にこれを導入していた人向けです。）
:::

両方の検査を有効にした `doctype`:

```json
{ "rules": { "doctype": "always" } }
```

は次になります:

```json
{
  "rules": {
    "require-doctype": true,
    "no-obsolete-doctype": true
  }
}
```

旧設定で `denyObsoleteType: false` を指定していた場合、`no-obsolete-doctype` は展開から完全に除外されます。

両方の検査を有効にした `landmark-roles`:

```json
{ "rules": { "landmark-roles": { "options": { "ignoreRoles": ["region"] } } } }
```

は次になります:

```json
{
  "rules": {
    "no-nested-top-level-landmark": { "options": { "ignoreRoles": ["region"] } },
    "require-landmark-label": true
  }
}
```

旧設定で `labelEachArea: false` を指定していた場合、`require-landmark-label` は展開から完全に除外されます。

両方の検査を有効にした `required-h1`:

```json
{ "rules": { "required-h1": { "options": { "in-document-fragment": true } } } }
```

は次になります:

```json
{
  "rules": {
    "require-h1": { "options": { "in-document-fragment": true } },
    "no-duplicate-h1": { "options": { "in-document-fragment": true } }
  }
}
```

旧設定で `expected-once: false` を指定していた場合、`no-duplicate-h1` は展開から完全に除外されます。

全ての検査を有効にした `no-unsupported-features`:

```json
{
  "rules": {
    "no-unsupported-features": {
      "options": { "checkExperimental": true, "checkNonStandard": true, "ignoreFeatures": ["css-grid"] }
    }
  }
}
```

は次になります:

```json
{
  "rules": {
    "no-unsupported-browser-features": { "options": { "ignoreFeatures": ["css-grid"] } },
    "no-experimental-features": { "options": { "ignoreFeatures": ["css-grid"] } },
    "no-nonstandard-features": { "options": { "ignoreFeatures": ["css-grid"] } }
  }
}
```

`no-experimental-features`/`no-nonstandard-features` は、旧設定が対応する `check*` オプションを明示的に `true` にしていない限り、それぞれ展開から完全に除外されます。どちらもデフォルトは `false` — つまり設定で明示的に要求しない限り検査自体が動いていませんでした。

`invalid-attr` は常に `no-unknown-attr`、`no-disallowed-attr`、`no-invalid-attr-value` へ展開されます。`no-restricted-attr` は旧設定が実際に `disallowAttrs` を指定していた場合にのみ加わるため、素の `invalid-attr: true` が「制限対象が何もないルール」を有効化することはありません。旧オプションは一括コピーではなく振り分けられます — どのオプションがどの新ルールに移るかは [`invalid-attr` のルール変更](/docs/migration/v4-to-v5/rules/invalid-attr)を参照してください。

## v5 での新規追加（v4 に相当なし） {#new-in-v5-no-v4-equivalent}

以下のルールには **v4 の前身が一切ありません** — 移行すべき対象がそもそも存在しません。それぞれ v5 の alpha/rc 開発中に、下表の「旧名」として導入され、今回の最終再設計でさらにもう一度リネームされています。実在する安定版 v4 を使っている場合、これらは単に新しく使えるようになった検査です。既に v5 のプレリリースを導入し、いずれかの「旧名」を設定していた場合は、通常通り `renamed(...)`/分割用エイリアスが自動的に展開します。

| 旧名（v5 プレリリース限定） | 新名                                                                                                                       | 検査内容                                                                                                                              |
| --------------------------- | -------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `correct-aspect-ratio`      | `no-mismatched-aspect-ratio`                                                                                               | 画像本来のアスペクト比と一致しない `width`/`height` 属性                                                                              |
| `input-file-empty-value`    | `no-input-file-value`                                                                                                      | 仕様で禁止されている `<input type="file" value="...">`                                                                                |
| `redundant-accessible-name` | `no-redundant-accessible-name`                                                                                             | 複数のアクセシブルネームソースを持ち、優先度の高いソースが低いソースを上書きしている要素                                              |
| `no-unsupported-features`   | `no-unsupported-browser-features`、`no-experimental-features`、`no-nonstandard-features`                                   | browserslist × BCD の未サポート機能、実験的機能フラグ、非標準機能フラグ（3者の関係は[上記](#option-routed-splits-before--after)参照） |
| `script-content`            | `valid-importmap`、`valid-speculation-rules`                                                                               | `type=importmap` / `type=speculationrules` の JSON 構造                                                                               |
| `srcset-sizes-constraint`   | `no-unpaired-srcset-sizes`、`no-mixed-srcset-descriptors`、`sizes-auto-requires-lazy-loading`、`no-always-matching-source` | `srcset`/`sizes` の整合性検査                                                                                                         |

## 削除 {#deletions}

`wai-aria` のみが実在する v4 の削除です。`input-button-non-empty-value` は v5 のプレリリース期間中に導入されてから完全に削除されたルールで、v4 の前身がありません — したがって実際の v4 ユーザーにとってはこちらも移行対象がありません。

| 削除されたルール                                                     | 代替                                                                                                                                                           |
| -------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `wai-aria`（傘ルール）                                               | その21個の後継ルール群: 20件は既に独立、加えて新設の `no-aria-on-unsupported-element` — [ARIA の変更](/docs/migration/v4-to-v5/aria#umbrella-rule-removed)参照 |
| `input-button-non-empty-value`（v5 プレリリース限定、v4 に前身なし） | `require-accessible-name` — [ARIA の変更](/docs/migration/v4-to-v5/aria#removed-input-button-non-empty-value)参照                                              |

## 責務の縮小 {#scope-narrowed}

- **`require-attr`**（旧 `required-attr`）: 単純なリネームであり、スコープの変更はありません。設計当初は存在検査のみに縮小し `{ name, value }` パターンマッチングを `no-restricted-attr` に移す案でしたが、実際に `no-restricted-attr` が実装された時点で再考されました。「この属性値がパターンに一致することを要求する」は肯定的な REQUIRE 制約であり拒否リストではないため、`no-restricted-attr` の拒否専用の形には否定パターンという不自然な形でしか収まりません。`require-attr` は改名前の全スコープ（`{ name, value }` マッチングを含む）を維持しています。
- **`label-has-control`**: 現在は関連付けられたコントロールを持たない `<label>` のみを検出します。同一 `<label>` 内の*2つ目以降*のコントロール検出は元々 `label-no-multiple-controls` の担当であり、`label-has-control` がそれも報告するのは重複でした。

## 既知の移行ギャップ {#known-migration-gap}

:::danger この2件には非推奨警告が出ません
2つのルールは名前を維持したまま（改名・非推奨化されない）分割による姉妹ルールを得ています。`permitted-contents`（→ `no-disallowed-ancestor` / `require-ancestor` / `no-duplicate-sibling-attr`）と `no-refer-to-non-existent-id`（→ `no-broken-fragment-link`）です。

*旧*名が変わらないため、それを展開するエイリアスのエントリが存在しません。プリセットを経由せず生設定でこれらのルールを直接有効化していた場合、分割された検査を**非推奨警告なしに**静かに失います。

プリセット経由のユーザーはおおむね影響を受けませんが、1件だけ抜けがあります。新しい姉妹チェックは既にそれぞれのプリセットエントリとして追加されていますが、`no-broken-fragment-link` は `a11y` プリセット（`no-refer-to-non-existent-id` と同居）には入っている一方、`html-standard` プリセットには入っていません。`html-standard` 自体は `no-refer-to-non-existent-id` を持っているにもかかわらずです。`markuplint:recommended` は両方を extends するため影響を受けませんが、`html-standard` 単体で extends している場合は影響を受けます。
:::

```json
{
  "rules": {
    "permitted-contents": true
  }
}
```

は、v5 で同じカバレッジを維持するには以下が必要です:

```json
{
  "rules": {
    "permitted-contents": true,
    "no-disallowed-ancestor": true,
    "require-ancestor": true,
    "no-duplicate-sibling-attr": true
  }
}
```

同様に `no-refer-to-non-existent-id` には `no-broken-fragment-link` を併記する必要があります。

## severity の変更

以下は全て正真正銘の v4 → v5 の severity 変更です — 下表の各ルールは（旧名で）実在する安定版 v4 に「v4」列の severity で存在していました。

| ルール                                                                  | v4                                                             | v5                  | 理由                                                                                                                |
| ----------------------------------------------------------------------- | -------------------------------------------------------------- | ------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `no-table-cell-overlap`/`no-table-span-overflow`/`no-empty-table-track` | `warning`                                                      | `error`             | table model error は MUST。仕様が許容する行幅不揃いは `consistent-table-row-length` として分離され `warning` を維持 |
| `no-duplicate-dt`                                                       | `error`                                                        | `warning`           | HTML LS では SHOULD として記述                                                                                      |
| `no-obsolete-attr`/`no-obsolete-element`                                | `error`（`deprecated-attr`/`deprecated-element` の一部として） | `error`（変更なし） | 廃止（仕様から削除）は MUST                                                                                         |
| `no-deprecated-attr`/`no-deprecated-element`                            | `error`（`deprecated-attr`/`deprecated-element` の一部として） | `warning`           | 事実データ（MDN/BCD 由来）であり仕様の MUST ではない                                                                |
| `no-broken-fragment-link`                                               | `error`（`no-refer-to-non-existent-id` の一部として）          | `warning`           | HTML LS の適合性違反ではない                                                                                        |
| `require-h1`/`no-duplicate-h1`                                          | `error`（`required-h1` として）                                | `warning`           | WCAG 達成技法 H42 は非規範的                                                                                        |
| `require-adjacent-popover`                                              | `error`（`neighbor-popovers` として）                          | `warning`           | HTML LS の非規範的な Note で言及されている                                                                          |

:::note 比較対象となる v4 の基準値がない3件
`no-mismatched-aspect-ratio`、`no-contradictory-aria-prop`、`require-owned-elements` はいずれも v5 で `error` ですが、これらのルール（や、そのプレリリース時の旧名である `correct-aspect-ratio`、`wai-aria` 分割の一部だった `wai-aria-implicit-props`/`wai-aria-required-owned-elements`）は、実在する安定版 v4 に一度も存在しませんでした。したがって「変更された」severity の前提となる値自体が存在しません。実際の v4 から移行する場合、これらは severity の昇格ではなく、新規の `error` レベル検査として扱ってください。
:::

`no-consecutive-br` は意図的な例外です: HTML LS の MUST の代理検出ですが、詩の連区切りなど正当な使用法で誤検知する可能性があるため `warning` を維持しています。

:::caution 緑だった CI が赤くなることがあります
上表の `warning` → `error` に変わった行（table model error 群）は3ルールを含みます。`--max-warnings 0` のような厳格な zero-warnings ゲートを使っているチームでは、無関係なコードでも CI が突然赤くなる可能性があります — アップグレード前に該当ルールに対する現在の warning 件数を確認してください。上記の新規 `error` レベル検査3件についても、v5 のプレリリース期間中に既に導入していた場合は同様です。
:::

## プリセットの変更

- **`code-styles`** と **`security`** は v4 では空でした（確認済み: 最後の安定版 v4 でもどちらのプリセットも `{}` のままでした）。`code-styles` には `case-sensitive-attr-name`/`case-sensitive-tag-name` を追加、`security` には `no-event-handler-attr` を追加しました。
- **`performance`** には現在 `head-element-order` と `no-mismatched-aspect-ratio` が平のルールとして含まれています（既存の `nodeRules` スコープのエントリは変更なし）。どちらも v4 の前身を持ちません — `no-mismatched-aspect-ratio` のプレリリース時の経緯は [v5 での新規追加](#new-in-v5-no-v4-equivalent) を、`head-element-order` は完全な新規です。
- **`html-standard`** からは `no-duplicate-dt`（SHOULD）と `no-ineffective-attr`（non-normative）が除外されました — どちらも v4 の `html-standard` プリセットに存在していたため、これは正真正銘の削除です。このプリセットは仕様準拠性が `sources: ['html']` かつ `level: 'must'` のルールのみを収容します。`input-button-non-empty-value` もルール自体の削除に伴いこのプリセットから消えています。また `itemprop-requires-itemscope` が追加されましたが、これは v4 の前身を一切持ちません。
- **`no-refer-to-non-existent-id`** と **`no-duplicate-id`** は `a11y` と `html-standard` の両方に属したままです — v4 でも両プリセットに含まれていたことを確認済みで、これは意図的に変更されていません。
- 9つのルールは意図的に**どのプリセットにも含まれません**（好みが分かれる書式ルール、または誤検知率が高い検査のため、明示的な設定が必要）: `attr-order`、`attr-value-quotes`、`class-naming`、`no-boolean-attr-value`、`no-default-value`、`no-empty-palpable-content`、`no-duplicate-dt`、`no-ineffective-attr`、`no-experimental-features`。各ルールの README に理由が明記されています。このうち `no-experimental-features` だけは好みの問題ではありませんが、これも v4 の前身を持ちません: `no-unsupported-features`（これ自体も v5 のプレリリース期間中に導入されたもの — [v5 での新規追加](#new-in-v5-no-v4-equivalent)参照）の `checkExperimental` オプション（デフォルト `false`）の後継であるため、有効化は明示的なオプトインのままです。`compat` プリセットには姉妹ルールの `no-unsupported-browser-features` と `no-nonstandard-features` の2件だけが入っています。
