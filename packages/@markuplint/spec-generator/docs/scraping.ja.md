# スクレイピング詳細

このドキュメントでは、`@markuplint/spec-generator` が使用するウェブスクレイピングの対象、CSS セレクタ、キャッシュ戦略、エラー処理について説明します。ビルドはネットワーク依存で、MDN および W3C 仕様に対して 200 以上の HTTP リクエストを発行します。

## MDN 要素スクレイピング

**モジュール:** `scraping.ts`

### URL パターン

HTML 要素:

```
https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/<name>
```

SVG 要素:

```
https://developer.mozilla.org/en-US/docs/Web/SVG/Reference/Element/<name>
```

MathML 要素:

```
https://developer.mozilla.org/en-US/docs/Web/MathML/Element/<name>
```

**特殊ケース:** 見出し要素（`h1`-`h6`）は単一のページにマッピング:

```
https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/Heading_Elements
```

### 抽出データ

各要素について `fetchHTMLElement()` が抽出する項目:

| データ   | セレクタ / メソッド                                                             | 備考                                                                        |
| -------- | ------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| 説明     | `main#content .reference-layout__header .content-section`                       | テキストコンテンツ、空白正規化済み                                          |
| 互換性   | `.bc-table tbody tr:first-child th`（アイコン）                                 | BC テーブルが利用不可の場合は notecard ベースのインジケータにフォールバック |
| カテゴリ | `#technical_summary ~ figure.table-container > table`（「Content categories」） | 既知のカテゴリキーワードとマッチング                                        |
| 属性     | `.content-section[aria-labelledby="<id>"] > dl > dt`                            | 複数セクションの定義リストからパース                                        |

### 互換性フラグの検出

ブラウザ互換性テーブルの有無に応じて2つの戦略を使用:

**戦略 1: ブラウザ互換性テーブル**（最初の行の `<code>` が要素名と一致する場合）

| フラグ         | `tbody tr:first-child th` 内のセレクタ |
| -------------- | -------------------------------------- |
| `experimental` | `.ic-experimental`                     |
| `obsolete`     | `.ic-obsolete`                         |
| `deprecated`   | `.ic-deprecated`                       |
| `nonStandard`  | `.ic-non-standard`                     |

**戦略 2: フォールバックインジケータ**（BC テーブルがない、またはマッチしない場合）

| フラグ         | セレクタ                                                                                                 |
| -------------- | -------------------------------------------------------------------------------------------------------- |
| `experimental` | `.blockIndicator.experimental` または `> div .notecard.experimental`                                     |
| `obsolete`     | `.obsoleteHeader` または `h1` テキストに "obsolete" を含む または `> div:first-child .notecard.obsolete` |
| `deprecated`   | `.deprecatedHeader` または `> div:first-child .notecard.deprecated` または `h1 + * .notecard.deprecated` |
| `nonStandard`  | `.nonStandardHeader` または `h4#Non-standard`                                                            |

### コンテンツカテゴリのパース

「Content categories」プロパティは技術サマリテーブルから抽出されます。テキストは以下のキーワードとマッチング（大文字小文字不区別）:

| キーワード            | カテゴリ             |
| --------------------- | -------------------- |
| `metadata content`    | `#metadata`          |
| `flow content`        | `#flow`              |
| `sectioning content`  | `#sectioning`        |
| `heading content`     | `#heading`           |
| `phrasing content`    | `#phrasing`          |
| `embedded content`    | `#embedded`          |
| `interactive content` | `#interactive`       |
| `palpable content`    | `#palpable`          |
| `script-supporting`   | `#script-supporting` |

### 属性の抽出

属性は `aria-labelledby` ID で識別される最大5つのセクションから抽出:

| セクション ID             | 適用されるステータスフラグ     |
| ------------------------- | ------------------------------ |
| `attributes`              | 属性ごとのアイコンからのフラグ |
| `deprecated_attributes`   | 見出しから `deprecated: true`  |
| `individual_attributes`   | 属性ごとのアイコンからのフラグ |
| `non-standard_attributes` | 属性ごとのアイコンからのフラグ |
| `obsolete_attributes`     | 見出しから `obsolete: true`    |

各 `<dt>` エントリについて:

1. `<code>` テキストから属性名を抽出
2. 次の `<dd>` 兄弟要素から説明を抽出
3. アイコンクラスからステータスフラグを検出:
   - `.icon-beaker`, `.icon.experimental`, `.icon.icon-experimental` -- experimental
   - `.icon-trash`, `.icon.obsolete`, `.icon.icon-obsolete`, `.obsolete` -- obsolete
   - `.icon-thumbs-down-alt`, `.icon.deprecated`, `.icon.icon-deprecated` -- deprecated
   - `.icon-warning-sign`, `.icon.non-standard`, `.icon.icon-nonstandard` -- non-standard
4. 見出しコンテキスト（`getItsHeading()`）でセクションレベルのフラグを確認

抽出した全属性はマージされ、キーでソートされます。

---

## MDN SVG インデックススクレイピング

**モジュール:** `svg.ts`

### 対象

```
https://developer.mozilla.org/en-US/docs/Web/SVG/Element
```

### 抽出プロセス

1. すべての `<section>` 要素をアンラップ（子要素で置換）してドキュメント構造をフラット化
2. `id="obsolete_and_deprecated_elements"` の見出しを検索
3. `getThisOutline()` で次の `<h2>` まで全兄弟要素を収集
4. `div > a` 要素から要素名を抽出し、山括弧を除去
5. 各名前に `svg_` プレフィックスを付加（例: `altGlyph` → `svg_altGlyph`）

---

## MDN MathML インデックススクレイピング

**モジュール:** `mathml.ts`

### 対象

```
https://developer.mozilla.org/en-US/docs/Web/MathML/Element
```

### 抽出プロセス

1. メインコンテンツ領域内の全 `<td> <code>` 要素を検索
2. `m` で始まる要素名（MathML の慣例）でフィルタリング
3. 含まれる `<tr>` の非推奨/非標準アイコンクラス（`.icon-deprecated`, `.icon-nonstandard`）を確認
4. 各非推奨/非標準要素名に `mml_` プレフィックスを付加（例: `maction` → `mml_maction`）

SVG と異なり、MathML には「Obsolete and deprecated elements」の独立したセクションはない。代わりに、要素テーブル内のアイコンでインラインに非推奨/非標準ステータスが表示される。

---

## WAI-ARIA スクレイピング

**モジュール:** `aria.ts`

### 仕様 URL

| バージョン | URL                                   | ステータス             |
| ---------- | ------------------------------------- | ---------------------- |
| 1.1        | `https://www.w3.org/TR/wai-aria-1.1/` | 勧告（Recommendation） |
| 1.2        | `https://www.w3.org/TR/wai-aria-1.2/` | 勧告（Recommendation） |
| 1.3        | `https://w3c.github.io/aria/`         | 草案（Working Draft）  |

### ロールの抽出

**セレクタ:** `#role_definitions section.role`

各ロールセクションについて:

| データ                             | セレクタ                                             |
| ---------------------------------- | ---------------------------------------------------- |
| 名前                               | `.role-name[title]`                                  |
| 説明                               | `.role-description p`（`\n\n` で結合）               |
| 抽象かどうか                       | `.role-abstract` テキストが "true"                   |
| 汎化                               | `.role-parent a`                                     |
| 必須プロパティ                     | `.role-required-properties li`（親にフォールバック） |
| 継承プロパティ                     | `.role-inherited li`                                 |
| 所有プロパティ                     | `.role-properties li` または `.role-properties > a`  |
| Required Accessibility Parent Role | `.role-scope li` または `.role-scope a`              |
| Allowed Accessibility Child Roles  | `.role-mustcontain li` または `.role-mustcontain a`  |
| アクセシブル名必須                 | `.role-namerequired` に "true" を含む                |
| アクセシブル名（著者から）         | `.role-namefrom` に "author" を含む                  |
| アクセシブル名（コンテンツから）   | `.role-namefrom` に "content" を含む                 |
| アクセシブル名禁止                 | `.role-namefrom` に "prohibited" を含む              |
| 子の表示                           | `.role-childpresentational` "true"/"false"           |
| 禁止プロパティ                     | `.role-disallowed li code`                           |

**ロール同義語の処理:**

- ARIA 1.1/1.2: `none` は `presentation` からプロパティを継承
- ARIA 1.3: `presentation` は `none` から継承; `img` は `image` から継承

### プロパティ/ステートの抽出

プロパティは、スクレイピングした全ロールの `ownedProperties` から検出されます。各プロパティについて:

**セレクタベース:** `#<property-name>`（例: `#aria-label`）

| データ             | セレクタ                                                                                       |
| ------------------ | ---------------------------------------------------------------------------------------------- |
| 型                 | セクションクラス: `/property/i` にマッチ → `"property"`、それ以外 → `"state"`                  |
| 非推奨             | セクションクラスに "deprecated" を含む                                                         |
| 値の型             | `table .${type}-value` または `table .property-value` または `.state-features .property-value` |
| 値の説明           | `table:is(.value-descriptions, .def:has(.value-description)) tbody tr`                         |
| 列挙値             | `.value-name` 要素から（`token` または `token list` 値型の場合のみ）                           |
| デフォルト値       | `.value-name .default` テキスト                                                                |
| グローバルかどうか | `#global_states li a` にリストされているか                                                     |

**条件付き値のオーバーライド:**

- `aria-checked`: 値を `"true/false"` に設定し、`checkbox` と `menuitemcheckbox` ロールに対して条件付きで `"tristate"` を追加
- `aria-hidden`: `hidden` HTML 属性の同等物を `isNotStrictEquivalent` としてマーク

### グローバルステート/プロパティ

グローバル ARIA 属性は `#global_states li` 下の全 `<a>` リンクを収集して識別します。各リンクのハッシュフラグメントがプロパティ名として使用されます。

---

## Graphics ARIA スクレイピング

**モジュール:** `aria.ts`

Graphics ARIA ロールは、同じ `getRoles()` 関数に `graphicsAria = true` を渡してフェッチします。

| バージョン | URL                                        |
| ---------- | ------------------------------------------ |
| 1.1        | `https://www.w3.org/TR/graphics-aria-1.0/` |
| 1.2        | `https://w3c.github.io/graphics-aria/`     |
| 1.3        | `https://w3c.github.io/graphics-aria/`     |

標準 ARIA ロールと同じ CSS セレクタが Graphics ARIA ロールにも適用されます。

---

## DPub ARIA スクレイピング

**モジュール:** `aria.ts`

DPub ARIA ロール（Digital Publishing WAI-ARIA Module）は `getDpubRoles()` 関数でフェッチされます。

| URL                                |
| ---------------------------------- |
| `https://w3c.github.io/dpub-aria/` |

DPub ARIA 仕様は標準 WAI-ARIA 仕様と同じ HTML 構造および CSS セレクタ（`#role_definitions section.role`、`.role-name[title]`、`.role-parent a` など）を使用しています。`getDpubRoles()` 関数は1回だけ呼び出され、41個のロールはすべての ARIA バージョンで共有されます。

---

## HTML-ARIA マッピング

**モジュール:** `aria.ts`（`getAriaInHtml()`）

### 対象

```
https://www.w3.org/TR/html-aria/
```

### セレクタ

```
#requirements-for-use-of-aria-attributes-in-place-of-equivalent-html-attributes table tbody tr
```

各行について:

- HTML 属性名: `th:nth-of-type(1) a`（最初のリンクテキスト）
- 暗黙の ARIA プロパティ: `td:nth-of-type(1) code`（最初のコード要素テキスト）
- プロパティ文字列を `=` で分割して ARIA プロパティ名と値を取得

**スキップ:** `contenteditable` 属性は祖先の評価が必要なため除外されます。

---

## キャッシュ

### プロセス内キャッシュ

`fetch.ts` に2つの `Map` キャッシュが存在:

| キャッシュ | キー | 値               | スコープ                               |
| ---------- | ---- | ---------------- | -------------------------------------- |
| `cache`    | URL  | 生の HTML 文字列 | 単一ビルド実行（プロセスの存続期間中） |
| `domCache` | URL  | `CheerioAPI`     | 単一ビルド実行（プロセスの存続期間中） |

- 同じ URL は単一ビルド内で二度フェッチされない
- 失敗したフェッチは空文字列としてキャッシュされ、リトライを防止
- **ビルド間の永続化はなし** -- `yarn up:gen` を実行するたびに全 URL を新たにフェッチ

### 失敗時のキャッシュ動作

`globalThis.fetch()` が例外をスローした場合:

1. その URL に対して空文字列がキャッシュされる
2. ビルドは継続（中断しない）
3. ページのフェッチに失敗した要素は空/欠落したメタデータを持つ

---

## エラー処理

| シナリオ               | 動作                                                                                 |
| ---------------------- | ------------------------------------------------------------------------------------ |
| HTTP フェッチ失敗      | 空文字列をキャッシュ、ビルド継続、メタデータは空                                     |
| DOM 要素が見つからない | Cheerio は空の選択を返し、フィールドはデフォルトで空になる                           |
| MDN ページ構造変更     | CSS セレクタがサイレントに失敗、影響を受けた要素のデータが失われる                   |
| W3C 仕様 URL 変更      | フェッチがエラーページの HTML を返し、スクレイピングがゴミを抽出するか何も取得しない |

ジェネレータはスクレイピングしたデータを期待される構造に対してバリデーションしません。不正確または欠落したデータはサイレントに `index.json` に伝播します。

---

## 既知の脆弱ポイント

以下の CSS セレクタは上流のページ構造変更に敏感です:

### MDN ページ

| セレクタ                                                        | 用途                | リスクレベル |
| --------------------------------------------------------------- | ------------------- | ------------ |
| `main#content`                                                  | メイン記事          | 低           |
| `.reference-layout__header .content-section`                    | 説明                | 中           |
| `.bc-table tbody tr:first-child th`                             | 互換性フラグ        | 中           |
| `#technical_summary ~ figure.table-container > table`           | 技術サマリ          | 高           |
| `.content-section[aria-labelledby="attributes"]`                | 属性セクション      | 中           |
| `.icon-beaker`, `.icon.experimental`, `.icon.icon-experimental` | experimental フラグ | 高           |
| `.icon-trash`, `.icon.obsolete`, `.icon.icon-obsolete`          | obsolete フラグ     | 高           |

### W3C ARIA 仕様ページ

| セレクタ                         | 用途                 | リスクレベル |
| -------------------------------- | -------------------- | ------------ |
| `#role_definitions section.role` | ロールセクション     | 低           |
| `.role-name[title]`              | ロール名             | 低           |
| `.role-required-properties li`   | 必須プロパティ       | 低           |
| `.role-properties li`            | 所有プロパティ       | 低           |
| `#global_states li a`            | グローバルプロパティ | 低           |

W3C 仕様はより構造化されたクラス名を使用しており、MDN セレクタよりも変更される可能性は低いです。

---

## スクレイピング失敗の診断

`yarn up:gen` 実行後、`index.json` の差分を確認:

```bash
git diff packages/@markuplint/html-spec/index.json
```

**スクレイピング失敗の兆候:**

- **大量のデータ消失** -- `index.json` から仕様データの大きな部分が消失。これはほぼ確実にスクレイピングの失敗を示しており、実際の仕様変更ではない
- **空の説明** -- 複数の要素で突然 `description` フィールドが空になる
- **属性の欠落** -- 以前存在していた属性が消失
- **空の ARIA データ** -- ロールやプロパティの定義が空、または大幅に減少

**根本原因:** 参照サイト（MDN、W3C）の HTML 構造、情報の記述方法、要素の ID/クラスが変更された。

**対処法:** 実際のページ構造を調べてどのモジュールの CSS セレクタが壊れているかを特定し、`scraping.ts` または `aria.ts` のセレクタを新しい構造に合わせて更新する。`yarn up:gen` を再実行して確認。
