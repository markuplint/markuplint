# ルールの改名・分割: v4 から v5 への移行ガイド

## 対象読者

- **全ユーザー** — これは v5（PR #3989）における全てのルール名変更のマスター参照です。ARIA 固有の詳細は [ARIA の変更](./aria.ja.md) を、改名・分割そのものを超えるオプション形式変更を持つルールについては `rules/` 配下の個別ガイドを参照してください。

## 概要

v5.0.0 ではルールカタログを全面的に見直しました: ESLint 準拠の一貫した動詞 prefix 命名、独立した仕様要求ごとに1ルール、そして機械可読な仕様準拠性メタデータです。rc.4 の82ルールは106ルールになります（分割25件・新設1件・削除2件）。

**何も静かに壊れません** — ただし1件だけ例外があります。改名・分割された全てのルールは旧名でも引き続き動作します — markuplint が非推奨警告を報告し、旧設定を新しいルールに自動的に展開します。旧名は v6 で削除されます。例外: 2つのルールは v5 以前の名前をそのまま保持しつつ、それを知らせるエイリアス/警告の仕組みを持たない分割先を新たに獲得します — 生設定（プリセットを使わない設定）で `permitted-contents` や `no-refer-to-non-existent-id` を直接使っている場合は [既知の移行ギャップ](#既知の移行ギャップ) を参照してください。

## カテゴリ

rc.4 の5分類（`validation`、`a11y`、`naming-convention`、`maintainability`、`style`）は、各ルールの `meta.ts` の `category` フィールドが持つ9分類に置き換えられました。`validation`（一覧性が悪いほど粗い分類だった — rc.4 の82ルールのうち53件がここに属していた）はルールが実際に検査する内容で細分化され、`naming-convention`（1ルール、`class-naming`）は `style` に統合されました。

| カテゴリ | カバーする内容 |
|---------|---------------|
| `syntax` | パースレベルの適合性 — 不正なマークアップ、文字参照、トークンレベルのタグ・要素構造 |
| `structure` | 文書・コンテンツモデルの構造 — 許可されるコンテンツ、祖先・子孫制約、doctype、テーブルモデル |
| `attributes` | 属性名・値の適合性 — 未知/不許可の属性、値の型検査、srcset、寸法 |
| `references` | 相互参照の整合性 — ID参照、`for`/`form`/`list`/`usemap` 属性の参照先 |
| `forms` | フォームコントロール固有のベストプラクティス |
| `a11y` | ARIA およびその他のアクセシビリティ固有の検査 |
| `style` | 唯一の正解が無い、好みが分かれる書式・命名の選好 |
| `maintainability` | 仕様準拠性やアクセシビリティに無関係な、プロジェクトの健全性に関する検査 |
| `compat` | ブラウザ・エンジンの互換性 — browserslist × BCD、実験的/非標準機能フラグ |

## 1:1 リネーム

| 旧名（rc.4） | 新名 |
|------------|------|
| `attr-duplication` | `no-duplicate-attr` |
| `id-duplication` | `no-duplicate-id` |
| `required-attr` | `require-attr`（単純なリネーム、スコープは維持 — 理由は下記[責務の縮小](#責務の縮小)参照） |
| `required-element` | `require-element` |
| `ineffective-attr` | `no-ineffective-attr` |
| `end-tag` | `require-end-tag` |
| `disallowed-element` | `no-restricted-element` |
| `correct-aspect-ratio` | `no-mismatched-aspect-ratio` |
| `heading-levels` | `no-skipped-heading-level` |
| `input-file-empty-value` | `no-input-file-value` |
| `neighbor-popovers` | `require-adjacent-popover` |
| `no-hard-code-id` | `no-hardcoded-id` |
| `no-use-event-handler-attr` | `no-event-handler-attr` |
| `redundant-accessible-name` | `no-redundant-accessible-name` |
| `use-list` | `no-pseudo-list` |
| `wai-aria-abstract-role` | `no-abstract-role` |
| `wai-aria-deprecated-role` | `no-deprecated-role` |
| `wai-aria-deprecated-props` | `no-deprecated-aria-prop` |
| `wai-aria-default-value` | `no-default-aria-value` |
| `wai-aria-implicit-role` | `no-redundant-role` |
| `wai-aria-no-global-prop` | `aria-prop-requires-role` |
| `wai-aria-non-existent-role` | `no-unknown-role` |
| `wai-aria-permitted-roles` | `permitted-roles` |
| `wai-aria-interaction-in-hidden` | `no-focusable-in-aria-hidden` |
| `wai-aria-presentational-children` | `no-aria-on-presentational-children` |
| `wai-aria-required-owned-elements` | `require-owned-elements` |
| `wai-aria-required-parent-role` | `require-parent-role` |
| `wai-aria-required-props` | `require-aria-prop` |
| `wai-aria-tab-requires-tabpanel` | `tab-requires-tabpanel` |
| `wai-aria-value` | `no-invalid-aria-prop-value` |

## 分割

各分割の検査は独立した仕様要求に対応しており、個別に有効化・無効化・severity 設定ができます。

| 旧名（rc.4） | 分割後 | 検査内容 |
|------------|-------|---------|
| `invalid-attr` | `no-unknown-attr` | 仕様に定義のない属性名（typo 候補・大文字小文字不一致） |
| | `no-disallowed-attr` | 定義はあるがこの文脈では許可されない属性（`noUse`、条件付き許可の条件外、autonomous custom element 上の `is`、ARIA属性を許可しない要素上の `aria-*`） |
| | `no-invalid-attr-value` | 属性値の型・文法違反 |
| | `no-restricted-attr` | ユーザー定義の `allowAttrs`/`disallowAttrs` 拒否リスト |
| `doctype` | `require-doctype` | DOCTYPE 宣言の完全な欠落 |
| | `no-obsolete-doctype` | public/system 識別子付きの旧型 DOCTYPE（`about:legacy-compat` は仕様通り許容） |
| `character-reference` | `no-malformed-character-reference` | parse5 の不正文字参照 parse error |
| | `no-unescaped-char` | 未エスケープの生 `<` またはあいまいな `&`（デフォルト）。`strict` オプションで `>`・`"`・全ての生 `&` も対象に追加 |
| `deprecated-attr` | `no-obsolete-attr` | HTML LS §16.2 の廃止属性（適合性違反、`error`） |
| | `no-deprecated-attr` | 仕様上は valid だが MDN/BCD が非推奨とマークする属性（`warning`） |
| `deprecated-element` | `no-obsolete-element` | 同上（要素、`error`） |
| | `no-deprecated-element` | 同上（要素、`warning`） |
| `landmark-roles` | `no-nested-top-level-landmark` | `banner`/`main`/`contentinfo` が他のランドマーク内に入れ子 |
| | `require-landmark-label` | 同一ランドマークロールが複数ある場合のアクセシブルネーム欠落 |
| `no-refer-to-non-existent-id` | `no-refer-to-non-existent-id` | `DOMID` 型属性・ARIA ID reference 型プロパティの参照先 ID 不在（ルールは名前を維持 — [既知の移行ギャップ](#既知の移行ギャップ)参照） |
| | `no-broken-fragment-link` | `a[href]`/`area[href]` のフラグメント参照先 ID 不在（`fragmentRefersNameAttr` オプションはこちらに移動） |
| `no-unsupported-features` | `no-unsupported-browser-features` | browserslist × BCD による対象ブラウザ未サポート |
| | `no-experimental-features` | 実験的機能フラグ（旧 `checkExperimental` オプション） |
| | `no-nonstandard-features` | 非標準機能フラグ（旧 `checkNonStandard` オプション） |
| `permitted-contents` | `permitted-contents` | 子ノードのコンテンツモデル適合（ルールは名前を維持 — [既知の移行ギャップ](#既知の移行ギャップ)参照） |
| | `no-disallowed-ancestor` | 禁止祖先の子孫として出現（仕様の `forbiddenAncestors`） |
| | `require-ancestor` | 必須祖先の欠落（仕様の `descendantOf`） |
| | `no-duplicate-sibling-attr` | 兄弟間で一意であるべき属性の重複（例: `track[default]`） |
| `required-h1` | `require-h1` | `<h1>` の欠落 |
| | `no-duplicate-h1` | `<h1>` の重複 |
| `script-content` | `valid-importmap` | `type=importmap` の JSON 構造 |
| | `valid-speculation-rules` | `type=speculationrules` の JSON 構造 |
| `srcset-sizes-constraint` | `no-unpaired-srcset-sizes` | 幅記述子と `sizes` の相互必須 |
| | `no-mixed-srcset-descriptors` | 幅記述子と密度記述子の混在 |
| | `sizes-auto-requires-lazy-loading` | `sizes=auto` に `loading=lazy` が伴わない |
| | `no-always-matching-source` | 後続に候補を持つ `source` に `media`/`type` がない |
| `table-row-column-alignment` | `no-table-cell-overlap` | `rowspan`/`colspan` によるセル重複（table model error） |
| | `no-table-span-overflow` | span の行グループ・表境界超過（table model error） |
| | `no-empty-table-track` | どのセルも開始しない行・列（table model error） |
| | `consistent-table-row-length` | 行ごとの列数不揃い（仕様は許容、4つのうち唯一 `warning` レベル） |
| `wai-aria-disallowed-props` | `no-prohibited-naming` | naming prohibited な要素での `aria-label`/`aria-labelledby`/`aria-braillelabel` |
| | `element-supports-aria-prop` | 要素（状態）固有に禁止・限定された `aria-*`（ARIA in HTML） |
| | `role-supports-aria-prop` | 計算されたロールがサポートしない状態・プロパティ（WAI-ARIA ロール定義） |
| `wai-aria-implicit-props` | `no-redundant-aria-prop` | 等価な HTML 属性と同義の冗長な `aria-*` |
| | `no-contradictory-aria-prop` | 等価な HTML 属性と矛盾する `aria-*` |

`wai-aria` 傘ルールの削除（見方によっては「21分割」— v5.0.0 リリース前に、その全検査は既に独立した後継ルールを持っていました）については [ARIA の変更](./aria.ja.md) を参照してください。

## 削除

| 削除されたルール | 代替 |
|-----------------|------|
| `wai-aria`（傘ルール） | その21個の既に独立していた後継ルール群 — [ARIA の変更](./aria.ja.md#傘ルールの削除) 参照 |
| `input-button-non-empty-value` | `require-accessible-name` — [ARIA の変更](./aria.ja.md#削除-input-button-non-empty-value) 参照 |

## 責務の縮小

- **`require-attr`**（旧 `required-attr`）: 単純なリネームであり、スコープの変更はありません。設計当初は存在検査のみに縮小し `{ name, value }` パターンマッチングを `no-restricted-attr` に移す案でしたが、実際に `no-restricted-attr` が実装された時点で再考されました — 「この属性値がパターンに一致することを要求する」は肯定的な REQUIRE 制約であり拒否リストではないため、`no-restricted-attr` の拒否専用の形には否定パターンという不自然な形でしか収まりません。`require-attr` は改名前の全スコープ（`{ name, value }` マッチングを含む）を維持しています。
- **`label-has-control`**: 現在は関連付けられたコントロールを持たない `<label>` のみを検出します。同一 `<label>` 内の*2つ目以降*のコントロール検出は元々 `label-no-multiple-controls` の担当であり、`label-has-control` がそれも報告するのは重複でした。

## 既知の移行ギャップ

2つのルールは名前を維持したまま（改名・非推奨化されない）分割による姉妹ルールを得ています: `permitted-contents`（→ `no-disallowed-ancestor`/`require-ancestor`/`no-duplicate-sibling-attr`）と `no-refer-to-non-existent-id`（→ `no-broken-fragment-link`）です。*旧*名が変わらないため、それを展開するエイリアステーブルのエントリが存在しません — プリセットを経由せず生設定でこれらのルールを直接有効化していた場合、分割された検査を**非推奨警告なしに**静かに失います。プリセット経由のユーザーは影響を受けません（新しい姉妹チェックは既にそれぞれのプリセットエントリとして追加されています）。

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

## severity の変更

| ルール | rc.4 | v5 | 理由 |
|-------|------|-----|------|
| `no-table-cell-overlap`/`no-table-span-overflow`/`no-empty-table-track` | `warning` | `error` | table model error は MUST。仕様が許容する行幅不揃いは `consistent-table-row-length` として分離され `warning` を維持 |
| `no-mismatched-aspect-ratio` | `warning` | `error` | HTML LS §4.8.17 の dimension attributes は MUST（同時に ±0.5px の許容誤差を実装 — 整数の `width`/`height` は常に割り切れるわけではないため） |
| `no-contradictory-aria-prop` | `warning`（`wai-aria-implicit-props` の一部として） | `error` | 等価 HTML 属性との矛盾は MUST。冗長側（`no-redundant-aria-prop`）は `warning` を維持 |
| `require-owned-elements` | `warning` | `error` | WAI-ARIA Required Owned Elements は MUST |
| `no-duplicate-dt` | `error` | `warning` | HTML LS では SHOULD として記述 |
| `no-obsolete-attr`/`no-obsolete-element` | `error`（`deprecated-attr`/`deprecated-element` の一部として） | `error`（変更なし） | 廃止（仕様から削除）は MUST |
| `no-deprecated-attr`/`no-deprecated-element` | `error`（`deprecated-attr`/`deprecated-element` の一部として） | `warning` | 事実データ（MDN/BCD 由来）であり仕様の MUST ではない |
| `no-broken-fragment-link` | `error`（`no-refer-to-non-existent-id` の一部として） | `warning` | HTML LS の適合性違反ではない |
| `require-h1`/`no-duplicate-h1` | `error`（`required-h1` として） | `warning` | WCAG 達成技法 H42 は非規範的 |
| `require-adjacent-popover` | `error`（`neighbor-popovers` として） | `warning` | HTML LS の非規範的な Note で言及されている |

`no-consecutive-br` は意図的な、明記された例外です: HTML LS の MUST の代理検出ですが、詩の連区切りなど正当な使用法で誤検知する可能性があるため `warning` を維持しています。

上表の `warning`→`error` に変わった4行は、`--max-warnings 0` のような厳格な zero-warnings ゲートを使っているチームでは、無関係なコードでも CI が突然赤くなる可能性があります — アップグレード前に、これらのルールに対する現在の warning 件数を確認してください。

## プリセットの変更

- **`code-styles`** と **`security`** は rc.4 では空でした。`code-styles` には `case-sensitive-attr-name`/`case-sensitive-tag-name` を追加、`security` には `no-event-handler-attr` を追加しました。
- **`performance`** に `head-element-order` と `no-mismatched-aspect-ratio` を平のルールとして追加（既存の `nodeRules` スコープのエントリは変更なし）。
- **`html-standard`** に `itemprop-requires-itemscope` を追加、`no-duplicate-dt`（SHOULD）と `no-ineffective-attr`（non-normative）を除外 — このプリセットは仕様準拠性が `sources: ['html']` かつ `level: 'must'` のルールのみを収容します。`input-button-non-empty-value` もルール自体の削除に伴いこのプリセットから消えています。
- **`no-refer-to-non-existent-id`** と **`no-duplicate-id`** は `a11y` と `html-standard` の両方に属したままです — これは rc.4 から変更ありません（意図的）。
- 8つのルールは意図的に**どのプリセットにも含まれません**（好みが分かれる書式ルール、または誤検知率が高い検査のため、明示的な設定が必要）: `attr-order`、`attr-value-quotes`、`class-naming`、`no-boolean-attr-value`、`no-default-value`、`no-empty-palpable-content`、`no-duplicate-dt`、`no-ineffective-attr`。各ルールの README に理由が明記されています。
