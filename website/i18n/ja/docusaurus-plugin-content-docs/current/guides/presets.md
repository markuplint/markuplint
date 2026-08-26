# プリセットを使う

プリセットは、厳選されたルールのセットを1行の設定で適用できる仕組みです。ルールをひとつずつ有効にする代わりに、`extends` プロパティにプリセットを指定します:

```json class=config
{
  "extends": ["markuplint:recommended"]
}
```

## どのプリセットを選ぶべきか

プロジェクトの種類に合わせて選んでください:

| プロジェクトの種類             | 推奨プリセット                       |
| ------------------------------ | ------------------------------------ |
| 静的HTML（フレームワークなし） | `markuplint:recommended-static-html` |
| React / Next.js / Preact       | `markuplint:recommended-react`       |
| Vue / Nuxt                     | `markuplint:recommended-vue`         |
| Svelte / SvelteKit             | `markuplint:recommended-svelte`      |
| その他 / 汎用                  | `markuplint:recommended`             |

すべての推奨プリセットは同じ**基本プリセット**（`a11y`、`html-standard`、`performance`、`rdfa`、`security`）を含み、さらにフレームワーク固有のルールが追加されます。

## プリセットの適用

### 推奨プリセット

- `markuplint:recommended`
- `markuplint:recommended-static-html`
- `markuplint:recommended-react`
- `markuplint:recommended-vue`
- `markuplint:recommended-svelte`

これらの**推奨プリセット**には、**すべての[基本プリセット](#base-presets)**が含まれています。また、`markuplint:recommended`以外はそれぞれフレームワーク固有のルールセット（例: [`markuplint:recommended-static-html`](#preset-static-html)、[`markuplint:recommended-react`](#preset-react)）を持っています。

### 基本プリセット {#base-presets}

より細かく制御したい場合は、個別の基本プリセットを選択することもできます:

- `markuplint:a11y`
- `markuplint:html-standard`
- `markuplint:performance`
- `markuplint:rdfa`
- `markuplint:security`

```json class=config
{
  "extends": ["markuplint:html-standard", "markuplint:a11y"]
}
```

各プリセットに含まれるルールは[ルールセット](#rulesets-of-base-presets)を参照してください。

## プリセット内の名前付きルール {#named-rules}

プリセットのチェックの一部は**名前付きルール**として定義されています。名前付きルールは `namespace/rule-name` 形式の名前を持ち、違反レポートに表示されます（例: `a11y/html-lang`）。

`rules` プロパティを使って、名前付きルールの無効化、深刻度の変更、名前空間ワイルドカードによる一括無効化が可能です。

```json class=config
{
  "extends": ["markuplint:recommended"],
  "rules": {
    // 特定の名前付きルールを無効化
    "a11y/html-lang": false,

    // 名前付きルールの深刻度を変更
    "a11y/no-autofocus-outside-dialog": { "severity": "warning" },

    // 名前空間内のすべての名前付きルールを無効化
    "a11y/*": false
  }
}
```

複数のプリセットが同じベースルールをラップしている場合（例: `a11y/id-duplication` と `html-standard/id-duplication`）、それぞれ独立して実行され、個別の違反を報告します。各ルールを個別に制御できます。

名前付きルールの一覧は、以下の[ルールセットのテーブル](#rulesets-of-base-presets)を参照してください。

## プリセットのルールセット {#rulesets-of-base-presets}

### `markuplint:a11y` {#preset-a11y}

| 名前付きルール                             | 解説                                                                                                                 |
| ------------------------------------------ | -------------------------------------------------------------------------------------------------------------------- |
| `a11y/id-duplication`                      | `id`属性値がドキュメント内で重複している場合に警告します。機械可読性の観点から、支援技術における問題を回避できます。 |
| `a11y/no-refer-to-non-existent-id`         | `for`、`form`、`aria-*`などに指定されたIDが同じドキュメント内に存在することを確認します。                            |
| `a11y/no-broken-fragment-link`             | ハイパーリンクに指定されたフラグメントが同じドキュメント内に存在するIDを参照していることを確認します。               |
| `a11y/wai-aria`                            | `role`属性と`aria-*`属性がWAI-ARIA、DPub-ARIA、およびARIA in HTML仕様に準拠していない場合に警告します。              |
| `a11y/require-accessible-name`             | ARIAロールに従ってアクセシブル名がない場合に警告します。                                                             |
| `a11y/redundant-accessible-name`           | 複数のアクセシブル名ソースが存在し、高優先度のソースが低優先度のソースを上書きする要素を検出します。                 |
| `a11y/label-has-control`                   | `<label>`要素が関連するコントロール要素を持たない場合に警告します。                                                  |
| `a11y/landmark-roles`                      | `banner`、`main`、`complementary`、`contentinfo`がトップレベルのランドマークであることを確認します。                 |
| `a11y/require-landmark-label`              | ロールが重複するランドマークが一意のアクセシブルネームを持つことを確認します。                                       |
| `a11y/required-h1`                         | ドキュメント内に`<h1>`要素がない場合に警告します。                                                                   |
| `a11y/html-lang`                           | 支援技術がドキュメントの言語を識別できるよう、`<html>`要素に`lang`属性を必須とします。                               |
| `a11y/abbr-title`                          | 略語の完全な展開を提供するため、`<abbr>`要素に`title`属性を必須とします。                                            |
| `a11y/media-track`                         | キャプションと説明のため、`<audio>`や`<video>`に`<track>`要素を必須とします。                                        |
| `a11y/video-autoplay-muted`                | 予期しない音声を防ぐため、`autoplay`属性を持つ`<video>`要素に`muted`属性を必須とします。                             |
| `a11y/no-accesskey`                        | 支援技術のショートカットと競合する可能性があるため、`accesskey`属性を禁止します。                                    |
| `a11y/tabindex-restrict`                   | 自然なタブ順序を壊さないよう、`tabindex`属性を`-1`または`0`のみに制限します。                                        |
| `a11y/no-autofocus-outside-dialog`         | フォーカスを強制的に奪うべきではありません。ただし`dialog`要素とその子孫では許可されます。                           |
| `a11y/viewport-no-user-scalable`           | 低視力ユーザーのズーム操作を妨げるため、viewportメタタグの`user-scalable=no`を禁止します。                           |
| `a11y/no-consecutive-br`                   | 連続した`<br>`タグの使用に対して警告します。代わりにCSSマージンや適切なブロック要素を使用してください。              |
| `a11y/no-ambiguous-navigable-target-names` | `_blank`などの特殊なナビゲーションキーワードを無効なターゲット名に置き換える可能性のあるタイポを防ぎます。           |
| `a11y/use-list`                            | テキストノードの先頭に箇条書き文字がある場合、リスト要素の使用を促します。                                           |
| `a11y/table-row-column-alignment`          | `colspan`と`rowspan`を考慮して、テーブルの行と列の数の一貫性を確認します。                                           |
| `a11y/no-table-cell-overlap`               | 2つのセルが同じスロットを覆うことになる`rowspan`/`colspan`の値を禁止します。                                         |
| `a11y/no-table-span-overflow`              | `<thead>`、`<tbody>`、`<tfoot>`の末尾を越えて伸びる`rowspan`を禁止します。                                           |
| `a11y/no-empty-table-track`                | セルがひとつも開始しないテーブルの行または列を禁止します。                                                           |
| `a11y/no-merge-cells`                      | 支援技術にとって困難なセル結合を防ぐため、テーブルセルの`colspan`と`rowspan`属性を禁止します。                       |
| `a11y/neighbor-popovers`                   | ポップオーバートリガーと対応するターゲットがDOM上で隣接していない場合に警告します。                                  |
| `a11y/summary-no-interactive`              | 支援技術がコンテンツにアクセスできない場合や、コンテンツが`<summary>`にマウスイベントを伝播しない場合があります。    |
| `a11y/require-dialog-autofocus`            | `showModal()`メソッドで表示されるダイアログに`autofocus`属性を持つ要素が必要です。                                   |

### `markuplint:html-standard` {#preset-html-standard}

仕様ベースの属性検証のため、基本ルール [`no-unknown-attr`](/docs/rules/no-unknown-attr)・[`no-disallowed-attr`](/docs/rules/no-disallowed-attr)・[`no-invalid-attr-value`](/docs/rules/no-invalid-attr-value) も有効にします。特定の属性を制限する名前付きルール（例: `a11y/no-accesskey`）は代わりに [`no-restricted-attr`](/docs/rules/no-restricted-attr) をラップします — このルールは設定された拒否リストのみを検査し、仕様検証は一切行わないため、どこで使っても狭いままです。

| 名前付きルール                                   | 解説                                                                                                                                          |
| ------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `html-standard/id-duplication`                   | `id`属性値がドキュメント内で重複している場合に警告します。                                                                                    |
| `html-standard/no-refer-to-non-existent-id`      | `for`、`form`、`aria-*`などに指定されたIDが同じドキュメント内に存在することを確認します。                                                     |
| `html-standard/attr-duplication`                 | パーサーは重複した属性をすべて無視します。                                                                                                    |
| `html-standard/deprecated-attr`                  | 仕様から完全に削除された(廃止された、非準拠の)属性を使用してはなりません。                                                                    |
| `html-standard/no-deprecated-attr`               | MDN/BCDが非推奨(仕様上はまだ定義されているが使用が推奨されない)とする属性に警告します。                                                       |
| `html-standard/deprecated-element`               | 仕様から完全に削除された(廃止された、非準拠の)要素を使用してはなりません。                                                                    |
| `html-standard/no-deprecated-element`            | MDN/BCDが非推奨(仕様上はまだ定義されているが使用が推奨されない)とする要素に警告します。                                                       |
| `html-standard/doctype`                          | 後方互換モードを回避する効果があります。                                                                                                      |
| `html-standard/no-obsolete-doctype`              | 廃止されたDOCTYPE(public識別子を持つもの、あるいは仕様が許容する唯一のlegacy文字列の例外以外のsystem識別子を持つもの)を使用してはなりません。 |
| `html-standard/permitted-contents`               | HTML仕様で親要素に許可されていない子要素がある場合に警告します。                                                                              |
| `html-standard/no-disallowed-ancestor`           | コンテンツモデルが禁止する祖先要素の子孫として要素が出現した場合に警告します(例: `<address>`の中の`<address>`)。                              |
| `html-standard/require-ancestor`                 | 要素が必須の祖先要素の外に出現した場合に警告します(例: `<map>`の外の`<area>`)。                                                               |
| `html-standard/no-duplicate-sibling-attr`        | コンテンツモデルが兄弟間で一意とする属性が、同じ親内の同種の要素に複数出現した場合に警告します。                                              |
| `html-standard/required-attr`                    | HTML仕様で定義された必須属性が要素に存在しない場合に警告します。                                                                              |
| `html-standard/ineffective-attr`                 | 要素に対して効果のない属性が指定されている場合に警告します（例: `<div>`に`disabled`）。                                                       |
| `html-standard/no-orphaned-end-tag`              | 対応する開始タグのない終了タグが現れた場合に警告します。内部解析エラーに該当します。                                                          |
| `html-standard/heading-levels`                   | 各見出しは前の見出しと同じか1レベル大きい必要があります。                                                                                     |
| `html-standard/no-duplicate-dt`                  | ひとつの`<dl>`要素内に、同じ名前の`<dt>`要素が複数あるべきではありません。                                                                    |
| `html-standard/placeholder-label-option`         | `<select>`要素がプレースホルダーラベルオプション（空の値を持つ最初の`<option>`）を必要とするかどうかを確認します。                            |
| `html-standard/require-datetime`                 | `<time>`要素の内容が有効な日時文字列でない場合、`datetime`属性が必要です。                                                                    |
| `html-standard/srcset-sizes-constraint`          | `srcset`が幅ディスクリプタを使用する場合は`sizes`を、またその逆も必須とします。                                                               |
| `html-standard/no-mixed-srcset-descriptors`      | `srcset`属性内で幅ディスクリプタとピクセル密度ディスクリプタを混在させることを禁止します。                                                    |
| `html-standard/sizes-auto-requires-lazy-loading` | `sizes="auto"`を使用する箇所では`loading="lazy"`を必須とします。                                                                              |
| `html-standard/no-always-matching-source`        | `srcset`付きの後続兄弟を持つ`<source>`にmediaまたはtype属性を必須とします。                                                                   |
| `html-standard/head-charset-utf8`                | ドキュメントheadに`<meta charset="UTF-8">`要素を必須とします。                                                                                |
| `html-standard/no-small-in-heading`              | `<h1>`〜`<h6>`内で`<small>`を使用すべきではありません。                                                                                       |
| `html-standard/figure-no-caption`                | `<figure>`内で`<table>`が`<figcaption>`以外の唯一のコンテンツである場合、`<caption>`を省略して`<figcaption>`を使用すべきです。                |
| `html-standard/input-pattern-title`              | `<input>`要素に`pattern`属性が指定されている場合、パターンの説明として`title`属性を含めるべきです。                                           |
| `html-standard/no-nested-details-name`           | 同じ名前グループ内の別の`<details>`要素の子孫である`<details>`要素をドキュメント内に含めることはできません。                                  |
| `html-standard/no-shortcut-icon`                 | `<link rel>`の`shortcut`キーワードは不要です。代わりに`rel="icon"`を使用してください。                                                        |

### `markuplint:performance` {#preset-performance}

| 名前付きルール                    | 解説                                                                                                       |
| --------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `performance/head-charset-utf8`   | ドキュメントheadに`<meta charset="UTF-8">`要素を必須とします。                                             |
| `performance/script-defer`        | レンダリングブロッキングを避けるため、スクリプトを遅延読み込み・解析すべきです。                           |
| `performance/img-aspect-ratio`    | **Cumulative Layout Shift**を避けるため、`<img>`に`width`と`height`属性を必須とします。                    |
| `performance/iframe-lazy-loading` | ビューポート外の要素によるレンダリングブロッキングを避けるため、`<iframe>`に`loading=lazy`を必須とします。 |

### `markuplint:rdfa` {#preset-rdfa}

`<meta property>` 要素に対し、`no-unknown-attr`・`no-disallowed-attr`・`no-invalid-attr-value` を拡張して `property` と `content` 属性を許可します。これにより、**Open Graph** 等のRDFaベースのメタデータが仕様検証の違反として報告されなくなります。また、同要素に対し `require-attr` を無効化します。

このプリセットは名前付きルールを公開しません。

### `markuplint:recommended-static-html` {#preset-static-html}

すべての[基本プリセット](#base-presets)に加えて、以下のルールが含まれます:

| 名前付きルール                                 | 解説                                                                                                           |
| ---------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| `static-html/character-reference`              | テキストノードまたは属性値でリテラルの`<`が文字参照でエスケープされていない場合に警告します。                  |
| `static-html/no-malformed-character-reference` | `&...;`の形をした文字参照が不正な形式(未知の名前、セミコロンの欠落、不正な数値参照)である場合に警告します。    |
| `static-html/end-tag`                          | 要素の終了タグが省略可能かどうかを人間が判断するのは非常に困難なため、常に終了タグを記述することを推奨します。 |

### `markuplint:recommended-react` {#preset-react}

すべての[基本プリセット](#base-presets)に加えて、以下のルールが含まれます:

| 名前付きルール          | 解説                                                                                                                                                 |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `react/no-hard-code-id` | IDをハードコーディングしたコンポーネントは、ドキュメント内でIDが一意でなければならないため、重複してマウントできません。動的なIDを使用してください。 |

### `markuplint:recommended-vue` {#preset-vue}

すべての[基本プリセット](#base-presets)に加えて、以下のルールが含まれます:

| 名前付きルール        | 解説                                                                                                                                                 |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `vue/no-hard-code-id` | IDをハードコーディングしたコンポーネントは、ドキュメント内でIDが一意でなければならないため、重複してマウントできません。動的なIDを使用してください。 |

### `markuplint:recommended-svelte` {#preset-svelte}

すべての[基本プリセット](#base-presets)に加えて、以下のルールが含まれます:

| 名前付きルール           | 解説                                                                                                                                                 |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `svelte/no-hard-code-id` | IDをハードコーディングしたコンポーネントは、ドキュメント内でIDが一意でなければならないため、重複してマウントできません。動的なIDを使用してください。 |

## 次のステップ

- **[ルールを適用する](/docs/guides/applying-rules)** — プリセットのルールをカスタマイズしたり、個別のルールを追加する
- **[HTML以外で使う](/docs/guides/beyond-html)** — JSX、Vue、Svelteなどのパーサーを設定する
- **[設定](/docs/configuration)** — 設定ファイルの形式とプロパティについて
