# ARIA 破壊的変更: v4 から v5 への移行ガイド

## 対象読者

- ARIA バージョンオプションを設定する**設定ファイル作成者**
- ARIA ロールやプロパティ情報にアクセスする**カスタムルール作成者**
- ARIA 属性をリントする**ユーザー** — `wai-aria` 傘ルールは削除されました。[傘ルールの削除](#傘ルールの削除)を参照してください

## 変更一覧

| 変更内容 | 影響範囲 |
|---------|---------|
| ARIA 1.3 サポートの追加、デフォルトに変更 | `ariaVersion: "1.2"` を設定していない全ユーザーの新しい動作 |
| ARIA 1.3 で `generic` ロールが透過的に | コンテンツモデルの検証 |
| ARIA 1.3 で `image` / `img` ロールが同義に | 許可されるロールの検証 |
| `wai-aria` 傘ルールの削除 | `wai-aria` を使用している全設定ファイル |
| `deprecated-element`/`no-unsupported-features`/`landmark-roles`/`required-h1` の分割、`input-button-non-empty-value` の削除 | `rules/` 配下の個別ルール移行ガイドおよび下記[改名・分割されたルール](#改名・分割されたルール)を参照 |

## ARIA 1.3 サポート

v5 では ARIA 1.3 を選択可能なバージョンとして追加し、**デフォルトを `"1.2"` から `"1.3"` に変更しました**。以前の動作が必要な場合は `ariaVersion: "1.2"` を明示的に設定してください。

### 有効化方法 / ARIA 1.2 への復元

`ruleCommonSettings` でグローバルに `ariaVersion` を設定します（[設定の移行ガイド](./config.ja.md)参照）:

```json
{
  "ruleCommonSettings": {
    "ariaVersion": "1.2"
  }
}
```

ルール単位で `options.ariaVersion` を受け付けるのは `require-accessible-name` と `no-refer-to-non-existent-id` の2つだけです。他の全ての ARIA 関連ルール（旧 `wai-aria` 傘ルールから独立した21件の後継ルール）は `ruleCommonSettings.ariaVersion` のみを読み取ります — それぞれ独自のバージョンオプションは持っていません。

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

### v5（ARIA 1.3 がデフォルトに）

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
| `generic` が子ロールで透過的 | いいえ | はい |
| `generic` が親ロールで透過的 | いいえ | はい |
| `presentation` / `none` が子ロールで透過的 | はい | はい |
| `presentation` / `none` が親ロールで透過的 | はい | はい |

## Image / IMG ロールの同義語

ARIA 1.3 では `image` がプライマリロール名、`img` がシノニムとなりました。いずれかが要素の許可されるロールに含まれる場合、両方が受け入れられます。これは許可ロール一覧に `img` を含む要素に影響します — `<img>` 自体は対象外です（暗黙ロールが既に `img` のため）。対象となるのは `<embed>` や `<iframe>` です:

```html
<!-- ARIA 1.2: <embed> に role="image" は許可されるロールに含まれない -->
<!-- ARIA 1.3: 許可されている "img" の同義語として role="image" が受理される -->
<embed src="chart.svg" role="image" />
```

## `<aside>` の条件付きロールマッピング（ARIA 1.3）

`<aside>` の暗黙のロールは ARIA 1.3 に基づき条件付きになりました: `<article>`/`<aside>`/`<blockquote>`/`<details>`/`<dialog>`/`<fieldset>`/`<figure>`/`<nav>`/`<section>`/`<td>` の子孫でない場合は `complementary`、子孫である場合は `generic` です。ただし `<aside>` 自体にアクセシブルネーム（`aria-label` など）がある場合は `complementary` を維持します。`landmark-roles` から分割された `no-nested-top-level-landmark`（下記参照）は、この理由により意図的に `complementary` をトップレベルランドマークとしてチェックしません — セレクタベースの検出では降格した `<aside>` と真の `complementary` を区別できないため、チェックするとそれらの祖先内にネストされたあらゆる `<aside>` で誤検知が発生します。

## 傘ルールの削除

v4/rc.4 では、`wai-aria` は21個の検査を1つに束ねた傘ルールで、各検査は独立したブールオプション（`checkingDeprecatedRole`、`disallowSetImplicitProps`、`checkingRequiredOwnedElements`/`checkingAllowedAccessibilityChildRoles` 等）で個別にトグルできました。v5.0.0 がリリースされる前に、これらの検査は全て既に独立したルールに分割されており（`no-abstract-role`、`no-unknown-role`、`require-owned-elements`、`no-focusable-in-aria-hidden` 等、合計20件）、`wai-aria` 自体は両方が有効な場合にその作業を重複させるだけになっていました。v5 ではこれが完全に削除され、傘ルールだけが消費していたオプショントグル機構も一緒に削除されます。

`wai-aria: v` は引き続き動作します — 非推奨警告が報告され、設定は21個の後継ルール（上記20件に加え新設の `no-aria-on-unsupported-element`）全てに同じ severity/reason で展開されます。傘ルールの各チェック用オプショントグルには展開先がありません: これらのルールは分割された時点で既に自身の検査を無条件に実行しており、いずれのスキーマも `options` オブジェクトを受け付けないため、トグルは単純に破棄されます。以前オプションで無効化していたチェックを無効のままにしたい場合は、そのルール自体を無効化してください:

```json
{
  "rules": {
    "no-redundant-role": false
  }
}
```

これは v4 で傘ルールの `disallowSetImplicitRole: false` によって無効化していたパターンに相当します。

### 新規ルール: `no-aria-on-unsupported-element`

傘ルールの最初の検査 — 仕様データが ARIA 属性を全くサポートしないとマークする要素上の `role`/`aria-*` を禁止する — は、v5 以前は独立した後継ルールを持っていませんでした。これは `no-aria-on-unsupported-element` として新設されました。

### 削除: `input-button-non-empty-value`

このルールは `<input type="button" value="">` を「アクセシブルネームが無い」ことの代理として検出していましたが、過検出（アクセシブルネームを持つ `aria-label` 付きボタンも報告してしまう）と検出漏れ（`value` 属性の省略を検出しない、これも同じ空のアクセシブルネームに計算される）の両方の問題がありました。`require-accessible-name` がこのケースを既に正しく検出するため、v5 ではこのルールを廃止し `require-accessible-name` に一元化しています。

## 改名・分割されたルール

ARIA 関連に限らず v5 の全ルール変更を網羅したマスター参照は [ルールの改名・分割](./rule-names.ja.md) を参照してください。

`wai-aria-*` プレフィックスを持っていた全ルールはプレフィックスを外し、v5 の命名規則に合わせて改名されます（例: `wai-aria-non-existent-role` → `no-unknown-role`、`wai-aria-required-owned-elements` → `require-owned-elements`）。うち2件はさらに分割されます:

| 旧ルール | 分割後 |
|---------|-------|
| `wai-aria-disallowed-props` | `no-prohibited-naming`、`element-supports-aria-prop`、`role-supports-aria-prop` |
| `wai-aria-implicit-props` | `no-redundant-aria-prop`（should レベル、warning）、`no-contradictory-aria-prop`（must レベル、error） |

さらに2件の ARIA 関連ルールも分割されます:

- `landmark-roles` → `no-nested-top-level-landmark`（`ignoreRoles` の半分） + `require-landmark-label`（`labelEachArea` の半分 — 旧設定で `labelEachArea: false` が明示されている場合は展開から除外）
- `required-h1` → `require-h1`（`<h1>` 欠落の半分） + `no-duplicate-h1`（`expected-once` の半分 — 旧設定で `expected-once: false` が明示されている場合は展開から除外）。両方ともデフォルトが `warning` に変更されました: いずれの根拠として最も近い WCAG 達成技法 H42 は非規範的です。

旧名は全て非推奨警告を出しつつ引き続き動作し、v6 で削除されます。
