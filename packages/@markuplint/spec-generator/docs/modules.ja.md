# モジュールリファレンス

`@markuplint/spec-generator` の各ソースモジュールの詳細ドキュメント。

## index.ts

メインオーケストレータ。`@markuplint/html-spec/build.mjs` が消費する公開 API をエクスポートします。

### `main(options: Options): Promise<void>`

3つの並列データ収集タスクを調整し、結果を `ExtendedSpec` オブジェクトに組み立て、JSON として書き込みます。

**フロー:**

1. `Promise.all` で3つのタスクを同時実行:
   - `getElements(htmlFilePattern)` -- 要素仕様
   - `getGlobalAttrs(commonAttrsFilePath)` -- グローバル属性定義
   - `getAria()` -- ARIA 定義
2. `getReferences()` でフェッチした全 URL を収集
3. `readJson(commonContentsFilePath).models` でコンテンツモデルを読み込み
4. `ExtendedSpec` オブジェクトを組み立て:
   ```typescript
   {
     cites: string[],              // ソート済み URL リスト
     def: {
       "#globalAttrs": { ... },    // グローバル属性カテゴリ
       "#aria": { ... },           // バージョンごとの ARIA データ
       "#contentModels": { ... }   // コンテンツモデルカテゴリ
     },
     specs: ExtendedElementSpec[]  // 要素仕様
   }
   ```
5. JSON を `outputFilePath` に書き込み

### `Options` 型

| フィールド               | 型       | 説明                                         |
| ------------------------ | -------- | -------------------------------------------- |
| `outputFilePath`         | `string` | 生成 JSON の書き込み先の絶対パス             |
| `htmlFilePattern`        | `string` | 要素ごとの JSON ファイルの絶対 glob パターン |
| `commonAttrsFilePath`    | `string` | グローバル属性 JSON の絶対パス               |
| `commonContentsFilePath` | `string` | コンテンツモデル JSON の絶対パス             |

---

## html-elements.ts

HTML および SVG 要素仕様の完全なリストを構築します。

### `getElements(filePattern: string): Promise<ExtendedElementSpec[]>`

**フロー:**

1. `readJsons()` で glob パターンにマッチする全仕様ファイルを読み込み。要素名は正規表現 `spec.([\w-]+).jsonc` でファイル名から抽出（例: `spec.a.jsonc` → `a`）
2. `getSVGElementList()` で非推奨 SVG 要素リストを取得
3. `fetchObsoleteElements()` で既存の仕様にない非推奨要素のスタブを生成
4. 各要素について MDN URL を構築し、`fetchHTMLElement()` でメタデータをスクレイピング:
   - 見出し要素（`h1`-`h6`）は MDN パス `Heading_Elements` にマッピング
   - SVG 要素は `/Web/SVG/Reference/Element/<name>` パスを使用
   - HTML 要素は `/Web/HTML/Reference/Elements/<name>` パスを使用
5. スクレイピングデータとローカル仕様データをマージ。**ローカル仕様データが優先**:
   - `cite` -- ローカル値があればそちらを使用、なければ MDN URL
   - `description`, `categories`, `omission` -- MDN から
   - `contentModel`, `aria` -- ローカル仕様のみ（スクレイピングされない）
   - `attributes` -- 属性名ごとにマージ; ローカルエントリが MDN エントリをオーバーライド
6. アルファベット順にソートし、SVG 要素を HTML 要素の後に配置

### `obsoleteList`

31個の非適合 HTML 要素のハードコードリスト:

`applet`, `acronym`, `bgsound`, `dir`, `frame`, `frameset`, `noframes`, `isindex`, `keygen`, `listing`, `menuitem`, `nextid`, `noembed`, `param`, `plaintext`, `rb`, `rtc`, `strike`, `xmp`, `basefont`, `big`, `blink`, `center`, `font`, `marquee`, `multicol`, `nobr`, `spacer`, `tt`

MDN から取得した非推奨 SVG 要素と組み合わせて、完全な非推奨セットを構成します。

---

## scraping.ts

MDN 要素リファレンスページからメタデータをスクレイピングします。CSS セレクタと脆弱ポイントの詳細は[スクレイピング詳細](scraping.ja.md)を参照。

### `fetchHTMLElement(link: string): Promise<ExtendedElementSpec>`

単一の MDN 要素ページをスクレイピングし、以下を含む要素仕様オブジェクトを返します:

- `description` -- `.reference-layout__header .content-section` から
- 互換性フラグ（`experimental`, `obsolete`, `deprecated`, `nonStandard`）-- ブラウザ互換性テーブルまたはフォールバックインジケータから
- `categories` -- 技術サマリテーブルの「Content categories」行をパース
- `attributes` -- `aria-labelledby` ID で識別されるセクションの定義リストから: `attributes`, `deprecated_attributes`, `individual_attributes`, `non-standard_attributes`, `obsolete_attributes`

### `fetchObsoleteElements(obsoleteList, specs): ExtendedElementSpec[]`

既存の仕様配列に存在しない非推奨要素の最小限のスタブを生成。各スタブは:

- `cite` は HTML 仕様の非推奨機能セクションを指す
- `obsolete: true`
- `contents: true`（任意のコンテンツ許可）
- `permittedRoles: true`, `implicitRole: false`

### プライベートヘルパー

- `getProperty($, prop)` -- MDN 技術サマリテーブル（`#technical_summary ~ figure.table-container > table`）から値を抽出
- `getAttributes($, id)` -- `.content-section[aria-labelledby="<id>"]` セクションの `<dt>`/`<dd>` ペアをパース
- `getItsHeading($start)` -- DOM を上方にたどって最も近い先行見出しを検索
- `upToPrevOrParent($start)` -- 前の兄弟要素またはに移動
- `isHeading($el)` -- 要素が `<h1>` から `<h6>` かどうかをテスト

---

## aria.ts

W3C ARIA 仕様からロールとプロパティの定義をスクレイピングします。URL パターンとセレクタの詳細は[スクレイピング詳細](scraping.ja.md)を参照。

### `getAria(): Promise<Record<ARIAVersion, { roles, props, graphicsRoles, dpubRoles }>>`

サポートされている3つのバージョンすべての ARIA データを返します。各バージョンについて:

1. `getRoles(version)` でロールを取得
2. `getProps(version, roles)` でプロパティ/ステートを取得
3. `getRoles(version, true)` でグラフィックス ARIA ロールを取得
4. `getDpubRoles()` で DPub ARIA ロールを取得（1回だけフェッチし、全バージョンで共有）

**実行順序:** バージョンは順次処理されます（1.3 → 1.2 → 1.1）。各バージョン内では、プロパティの前にロールを取得する必要があります（プロパティはロールの `ownedProperties` から検出されるため）。

### URL マッピング

| バージョン | ARIA 仕様 URL                         | Graphics ARIA URL                          |
| ---------- | ------------------------------------- | ------------------------------------------ |
| 1.1        | `https://www.w3.org/TR/wai-aria-1.1/` | `https://www.w3.org/TR/graphics-aria-1.0/` |
| 1.2        | `https://www.w3.org/TR/wai-aria-1.2/` | `https://w3c.github.io/graphics-aria/`     |
| 1.3        | `https://w3c.github.io/aria/`         | `https://w3c.github.io/graphics-aria/`     |

**DPub ARIA URL:** `https://w3c.github.io/dpub-aria/`（全バージョン共通）

### プライベート関数

- `getRoles(version, graphicsAria?)` -- `#role_definitions section.role` 要素をスクレイピング。抽出内容: name, description, generalization, owned properties（required/inherited/general）, required context roles, required owned elements, accessible name 設定, children presentational フラグ, prohibited properties。ロールの同義語を処理（`none`/`presentation`, `image`/`img`）
- `getDpubRoles()` -- DPub ARIA 仕様からデジタル出版ロール（例: `doc-abstract`, `doc-chapter`）をスクレイピング。`getRoles()` と同じ CSS セレクタを使用。41個の DPub ロールは1回だけフェッチされ、全 ARIA バージョンで共有される
- `getProps(version, roles)` -- 全ロールの `ownedProperties` からプロパティリストを構築し、各プロパティのセクションをスクレイピング: type（property/state）, value type, enum values, default value, global フラグ, 同等の HTML 属性。`aria-checked` と `aria-hidden` の条件付き値オーバーライドを適用
- `getAriaInHtml()` -- `https://www.w3.org/TR/html-aria/` から HTML 属性と ARIA プロパティのマッピングテーブルをスクレイピング。`contenteditable` はスキップ（祖先の評価が必要なため）
- `$$(el, selectors)` -- 複数の CSS セレクタを試し、最初の非空マッチを返す

---

## fetch.ts

キャッシュとプログレス表示付きの HTTP フェッチレイヤー。

### キャッシュ

2つのインメモリ `Map` キャッシュ:

| キャッシュ | キー | 値                        | 目的                        |
| ---------- | ---- | ------------------------- | --------------------------- |
| `cache`    | URL  | 生の HTML 文字列          | 同じ URL の再フェッチを回避 |
| `domCache` | URL  | `CheerioAPI` インスタンス | 同じ HTML の再パースを回避  |

キャッシュはプロセススコープです。ビルド間での永続化はありません。

### `fetch(url: string): Promise<CheerioAPI>`

パース済みの Cheerio DOM インスタンスを返します。まず `domCache` を確認し、なければ `fetchText()` に委譲して生の HTML を取得します。

### `fetchText(url: string): Promise<string>`

`globalThis.fetch()` を使用して URL の生テキストコンテンツを取得します。失敗時（例外発生時）は空文字列をキャッシュして返します。各呼び出しで CLI プログレスバーを更新します。

### `getReferences(): string[]`

プログレスバーを終了し、フェッチした全 URL のソート済みリストを返します。全スクレイピング完了後に一度だけ呼び出されます。

### プログレスバー

`cli-progress` の `shades_grey` プリセットを使用。モジュール読み込み時にバーが開始され、各フェッチ呼び出しで更新されます。フォーマット:

```
🔎 Fetch references... ████░░░░ 45% | ETA: 30s | 90/200 🔗 https://develo...ments/div
```

---

## read-json.ts

コメントサポート付き JSON ファイル読み込み。

### `readJson<T>(filePath: string): T`

単一の JSONC ファイルを読み込みます。`jsonc-parser` を使用して `//` および `/* */` コメント付き JSON をパースします。パスが絶対パスでない場合はエラーをスローします。

### `readJsons<T>(pattern: string, hook?): Promise<T[]>`

絶対 glob パターンにマッチする全 JSON ファイルを読み込みます。オプションで `hook` 関数により各結果を変換可能（ファイル名とパース済みボディを受け取る）。全ファイルを `Promise.all` で並列読み込みします。

---

## global-attrs.ts

### `getGlobalAttrs(filePath: string): SpecDefs["#globalAttrs"]`

`readJson()` の薄いラッパーで、指定された JSON ファイルからグローバル属性定義を読み込んで返します。

---

## svg.ts

### `getSVGElementList(): Promise<string[]>`

MDN SVG 要素インデックスページ（`https://developer.mozilla.org/en-US/docs/Web/SVG/Element`）をフェッチし、「Obsolete and deprecated elements」セクションから非推奨/廃止 SVG 要素名を抽出します。

**処理:**

1. すべての `<section>` ラッパーをアンラップ（子要素で置換）
2. `#obsolete_and_deprecated_elements` 見出しを検索
3. `getThisOutline()` で次の `<h2>` まで兄弟要素を収集
4. `<a>` タグから要素名を抽出し、`svg_` プレフィックスを付加

`["svg_altGlyph", "svg_altGlyphDef", ...]` のような名前を返します。

---

## utils.ts

複数のモジュールで使用される共有ヘルパー関数。

### `nameCompare(a, b): number`

`name` プロパティ（または文字列値）による大文字小文字を区別しない比較。コードベース全体でソートのコンパレータとして使用。

### `sortObjectByKey<T>(o: T): T`

同じキーバリューペアを持つ新しいオブジェクトを、キーのアルファベット順（`nameCompare` 使用）でソートして返します。

### `arrayUnique<T extends { name: string }>(array: T[]): T[]`

`name` プロパティに基づいて重複項目を除去し、最初の出現のみを保持します。

### `getThisOutline($, $start): Cheerio<Element>`

`$start` の後の全兄弟要素を次の `<h2>` 見出しまで収集し、コンテナ `<div>` でラップします。`svg.ts` で見出しで定義されたセクションのコンテンツを抽出するために使用。

### `mergeAttributes<T>(fromDocs: T, fromJSON: T): T`

2つの属性オブジェクトを浅くマージし、`fromJSON` の値を優先します。

### `keys<T, K>(object: T): K[]`

カスタム型キャスト付きの `Object.keys()` を返します。

### `getName(origin: string): { localName, namespace?, ml }`

要素名文字列をパース:

| 入力           | `localName` | `namespace`                    | `ml`     |
| -------------- | ----------- | ------------------------------ | -------- |
| `"div"`        | `"div"`     | `undefined`                    | `"HTML"` |
| `"svg_circle"` | `"circle"`  | `"http://www.w3.org/2000/svg"` | `"SVG"`  |
