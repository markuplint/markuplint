# メンテナンスガイド

`@markuplint/spec-generator` の実践的な運用・メンテナンスガイド。

## コマンド

| コマンド                                              | 説明                                                       |
| ----------------------------------------------------- | ---------------------------------------------------------- |
| `yarn build --scope @markuplint/spec-generator`       | TypeScript を `lib/` にコンパイル                          |
| `yarn workspace @markuplint/spec-generator run dev`   | ウォッチモードでコンパイル                                 |
| `yarn workspace @markuplint/spec-generator run clean` | コンパイル出力をクリーン                                   |
| `yarn up:gen`                                         | 仕様生成を実行（html-spec 経由でこのパッケージを呼び出し） |

**注意:** このパッケージは直接実行されません。`@markuplint/html-spec/build.mjs` が消費し、`main()` を呼び出します。完全な生成をトリガーするには `yarn up:gen` を使用してください。

## トラブルシューティング

### スクレイピング失敗の検出

`yarn up:gen` 実行後、必ず `index.json` の差分を確認:

```bash
git diff packages/@markuplint/html-spec/index.json
```

**スクレイピング失敗の兆候:**

- 差分が極端に大量のデータ消失を示す（仕様データが一括で消失）
- 複数の要素で突然 `description` フィールドが空になる
- 以前存在していた属性が削除される
- ARIA ロールやプロパティの定義が空、または大幅に減少

**これはほぼ確実にスクレイピングの失敗であり**、実際の仕様変更ではありません。正当な仕様変更は漸進的で、少数の要素にのみ影響します。

**根本原因:** 参照サイト（MDN または W3C）の HTML 構造、情報の記述方法、要素の ID/クラスが変更された。

**対処法:**

1. 影響を受けているデータを特定（要素メタデータ、ARIA ロール、SVG 要素など）
2. 該当するモジュールを特定:
   - 要素の説明、カテゴリ、属性 -- `scraping.ts`
   - ARIA ロールとプロパティ -- `aria.ts`
   - SVG 非推奨要素 -- `svg.ts`
3. 影響を受けたウェブページをブラウザで開き、現在の HTML 構造を調査
4. モジュールの CSS セレクタを新しい構造に合わせて更新
5. ビルド: `yarn build --scope @markuplint/spec-generator`
6. 再生成: `yarn up:gen`
7. `index.json` の差分が正しくなったことを確認

### ビルドコンパイルエラー

`yarn build --scope @markuplint/spec-generator` が失敗する場合:

1. `@markuplint/ml-spec` の型が変更されていないか確認（これが主要な型プロバイダ）
2. 開発依存がインストールされていることを確認: `yarn install`
3. クリーンビルドを試行: `yarn workspace @markuplint/spec-generator run clean && yarn build --scope @markuplint/spec-generator`

### 生成時のネットワークエラー

**症状:** `yarn up:gen` が失敗またはハングする。

**原因:** MDN または W3C サーバーに到達できない。

**対処法:**

- ネットワーク接続を確認
- 失敗したフェッチは空文字列としてキャッシュされ、ビルドは継続
- プログレスバーが現在フェッチ中の URL を表示 -- どのドメインが失敗しているか特定
- サービスが利用可能になったら再試行

## レシピ

### 1. MDN ページ構造変更への対応

MDN が要素リファレンスページを再構築した場合、`scraping.ts` の CSS セレクタの更新が必要です。

1. 実際のページ HTML と `scraping.ts` のセレクタを比較して影響を受けたセレクタを特定
2. 確認すべき主要セレクタ:
   - `MAIN_ARTICLE_SELECTOR`（`main#content`）-- メインコンテンツ領域
   - `.reference-layout__header .content-section` -- 説明の抽出
   - `.bc-table tbody tr:first-child th` -- 互換性テーブル
   - `#technical_summary ~ figure.table-container > table` -- 技術サマリ
   - `.content-section[aria-labelledby="attributes"]` -- 属性セクション
   - アイコンクラス（`.ic-experimental`, `.ic-deprecated` など）-- ステータスフラグ
3. セレクタを新しい構造に合わせて更新
4. ビルド: `yarn build --scope @markuplint/spec-generator`
5. 再生成: `yarn up:gen`
6. 差分で正しいデータの復元を確認

### 2. 新しい ARIA バージョンの追加

新しい ARIA 仕様バージョンが公開された場合（例: 1.4）:

1. `src/aria.ts` を開く
2. `getARIASpecURLByVersion()` に新しいケースを追加:
   ```typescript
   case '1.4': {
     if (!graphicsAria) {
       return 'https://www.w3.org/TR/wai-aria-1.4/'; // またはエディターズドラフト URL
     }
     return 'https://w3c.github.io/graphics-aria/';
   }
   ```
3. `getAria()` に新しいバージョンを追加:
   ```typescript
   const roles14 = await getRoles('1.4');
   // ...
   '1.4': {
     roles: roles14,
     props: await getProps('1.4', roles14),
     graphicsRoles: await getRoles('1.4', true),
     dpubRoles,
   },
   ```
4. **パッケージ間連携:** `@markuplint/ml-spec` の `ARIAVersion` 型も `'1.4'` を含むよう更新が必要
5. ビルドと再生成を実行

### 3. 非推奨リストへの要素追加

新しく非推奨になった HTML 要素を追加するには:

1. `src/html-elements.ts` を開く
2. `obsoleteList` 配列に要素名を追加
3. 要素は自動的に `obsolete: true` の最小限の仕様スタブを取得
4. ビルド: `yarn build --scope @markuplint/spec-generator`
5. 再生成: `yarn up:gen`
6. `index.json` で要素が `"obsolete": true` で表示されることを確認

### 4. ExtendedSpec 型変更への追従

`@markuplint/ml-spec` が `ExtendedSpec` や `ExtendedElementSpec` の型を変更した場合:

1. どのフィールドが追加、削除、変更されたか確認
2. `src/index.ts` のアセンブリロジック（`json` オブジェクト）を更新
3. 新しいフィールドを外部データから取得する必要がある場合はスクレイピングモジュールを更新
4. ビルドと再生成で確認

### 5. cheerio メジャーバージョン更新時の対応

`cheerio` パッケージはスクレイピングに使用される DOM API を提供します。更新時:

1. cheerio の変更履歴で破壊的 API 変更を確認
2. 使用されている主要 API: `.find()`, `.text()`, `.attr()`, `.toArray()`, `.each()`, `.next()`, `.prev()`, `.parent()`, `.children()`, `.before()`, `.remove()`, `.clone()`, `.append()`, `.filter()`, `.siblings()`, `.prop()`
3. `cheerio.load()`（`fetch.ts` で使用）も確認
4. HTML パース動作が変更された場合はセレクタを更新
5. ビルドと再生成で確認

## デバッグ

### 個別要素のスクレイピング結果確認

特定の要素についてスクレイピングされるデータをデバッグするには:

1. `scraping.ts` の `fetchHTMLElement()` 呼び出し後に一時的なログを追加:
   ```typescript
   const mdnData = await fetchHTMLElement(cite);
   if (localName === 'your-element') {
     console.log(JSON.stringify(mdnData, null, 2));
   }
   ```
2. ビルドして `yarn up:gen` を実行
3. スクレイピングデータのコンソール出力を確認
4. デバッグ後に一時的なログを削除

### キャッシュされたフェッチ結果の調査

`fetch.ts` の `cache` Map はすべての生の HTML レスポンスを保存しています。特定の URL のフェッチ内容を調査するには:

1. `fetchText()` に一時的なログを追加:
   ```typescript
   if (url.includes('your-search-term')) {
     console.log(`Fetched ${url}: ${text.length} chars`);
   }
   ```
2. 長さが 0 の場合はフェッチ失敗を示す（空文字列がキャッシュされた）

### ARIA ロールスクレイピングの確認

特定の ARIA バージョンから抽出されたロールを確認するには:

1. `getAria()` 内の `getRoles()` 後に一時的なログを追加:
   ```typescript
   const roles13 = await getRoles('1.3');
   console.log(`ARIA 1.3 roles: ${roles13.map(r => r.name).join(', ')}`);
   ```

## 依存関係メモ

### cheerio

- バージョン: 1.1.2
- パースされた HTML に対する jQuery 風 DOM API を提供
- `scraping.ts`, `aria.ts`, `svg.ts`, `fetch.ts` 全体で使用
- `CheerioAPI` 型は `cheerio` から、`Element` は `domhandler`（cheerio の基盤 DOM ライブラリ）からインポート

### fast-xml-parser

- バージョン: 5.3.4
- 依存として記載されているが、現在どのソースモジュールからもインポートされていない
- 将来の XML パースニーズのために予約されている可能性あり

### jsonc-parser

- `read-json.ts` で JSONC ファイル（`//` および `/* */` コメント付き JSON）のパースに使用
- `html-spec` パッケージは仕様ファイルの先頭に仕様 URL の参照としてコメントを使用

### cli-progress

- バージョン: 3.12.0
- フェッチ操作中のターミナルプログレスバーを提供
- `fetch.ts` でモジュール読み込み時に初期化
- `shades_grey` プリセットを使用
