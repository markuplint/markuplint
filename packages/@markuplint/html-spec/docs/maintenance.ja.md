# メンテナンスガイド

`@markuplint/html-spec` パッケージの日常的なメンテナンス作業に関するガイドです。仕様ファイルの追加・変更、ビルド、テスト、トラブルシューティングの手順を解説します。

## コマンド

| コマンド                                                | 説明                                          |
| ------------------------------------------------------- | --------------------------------------------- |
| `yarn workspace @markuplint/html-spec run gen`          | フル生成: ビルド + Prettierフォーマット       |
| `yarn workspace @markuplint/html-spec run gen:build`    | `node build.mjs` を実行して index.json を生成 |
| `yarn workspace @markuplint/html-spec run gen:prettier` | Prettier で index.json をフォーマット         |
| `yarn up:gen`                                           | リポジトリルートから全specパッケージを再生成  |

## よくあるレシピ

### 1. 新しいHTML要素の追加

1. `src/spec.<element>.json` を作成（例: `src/spec.dialog.json`）
2. 最低限以下を定義:
   - `contentModel` と `contents`
   - `globalAttrs`（通常 `#HTMLGlobalAttrs`, `#GlobalEventAttrs`, `#ARIAAttrs` を `true` に設定）
   - `attributes`（要素固有属性、空 `{}` でも可）
   - `aria` と `implicitRole`, `permittedRoles`
3. ファイル先頭に関連仕様URLのコメントを追加（`//` 形式、`strip-json-comments` で処理される）
4. 要素がいずれかのコンテンツカテゴリ（flow、phrasing 等）に属する場合、
   `src/spec-common.contents.json` の該当カテゴリに追加する。追加しないと
   `@markuplint/rules` の `permitted-contents` ルールがそのカテゴリを許可する
   親要素の中で不正な子要素として検出してしまう
5. `yarn workspace @markuplint/html-spec run gen` を実行
6. `index.json` に要素が正しく表示されることを確認
7. `yarn workspace @markuplint/html-spec run test` でスキーマ検証が通ることを確認

最小限のテンプレート:

```jsonc
// https://html.spec.whatwg.org/multipage/...
{
  "contentModel": {
    "contents": [{ "oneOrMore": ":model(phrasing)" }],
  },
  "globalAttrs": {
    "#HTMLGlobalAttrs": true,
    "#GlobalEventAttrs": true,
    "#ARIAAttrs": true,
  },
  "attributes": {},
  "aria": {
    "implicitRole": false,
    "permittedRoles": true,
  },
}
```

### 2. 既存要素の属性変更

1. 該当する `src/spec.<element>.json` を開く
2. `attributes` オブジェクトにエントリを追加・変更
3. 条件付き属性の場合、CSSセレクタで `condition` フィールドを追加
4. `yarn workspace @markuplint/html-spec run gen` を実行
5. `index.json` で属性が正しいメタデータとともに表示されることを確認

### 3. SVG要素の追加

1. `src/spec.svg_<localname>.json` を作成（例: `src/spec.svg_circle.json`）
2. ファイル名の `svg_` プレフィックスから、要素名は `svg:<localname>` として自動推論される
3. SVG固有のグローバル属性カテゴリ（`#SVGCoreAttrs`, `#SVGPresentationAttrs` 等）を使用
4. ARIAの `permittedRoles` にはAAM参照オブジェクト（`{ "core-aam": true, "graphics-aam": true }`）を使用
5. SVG属性には `animatable` フラグと SVG/CSS 型（`<svg-length>`, `<percentage>` 等）を指定
6. `yarn workspace @markuplint/html-spec run gen` を実行

### 4. グローバル属性カテゴリの変更

1. `src/spec-common.attributes.json` を編集
2. 各トップレベルキーがカテゴリ（例: `#HTMLGlobalAttrs`, `#SVGCoreAttrs`）
3. カテゴリ内の属性定義を追加・削除・変更
4. `yarn workspace @markuplint/html-spec run gen` を実行
5. そのカテゴリを参照する全要素に変更が反映される

### 5. コンテンツモデルカテゴリの追加・更新

1. `src/spec-common.contents.json` を編集
2. `models` オブジェクトに新しいエントリを追加、または既存カテゴリに要素を追加
3. SVG要素には `svg|<name>` プレフィックスを使用
4. 要素仕様で `:model(newCategory)` として参照
5. `yarn workspace @markuplint/html-spec run gen` を実行

**重要:** コンテンツモデルカテゴリは下流パッケージの動作に直接影響する:

- `@markuplint/ml-spec` が `contentModelCategoryToTagNames()` でカテゴリ名を
  要素リストに解決する。カテゴリに要素が未登録だと、そのカテゴリを許可する
  親要素内で有効なコンテンツとして認識されない
- `@markuplint/rules` の `permitted-contents` ルールがこのパターンに基づいて
  子要素を検証する。新要素がカテゴリに未追加だと不正な子要素として検出される
- `#palpable` カテゴリは `no-empty-palpable-content` ルールで使用される
- 新しいカテゴリ名は `@markuplint/ml-spec/schemas/content-models.schema.json`
  の `Category` 列挙型にも適合する必要がある

### 6. ARIAマッピングの更新

1. 該当する `src/spec.<element>.json` を開く
2. `aria` オブジェクトを変更:
   - `implicitRole` でデフォルトロールを変更
   - `permittedRoles` 配列を更新
   - コンテキスト依存ARIAの `conditions` を追加・変更
   - `"1.1"` や `"1.2"` キーでバージョン固有オーバーライドを追加
3. 参照仕様（WAI-ARIA、HTML-ARIA）を確認
4. `yarn workspace @markuplint/html-spec run gen` を実行

**ARIA バージョンについて:** WAI-ARIA 1.1 と 1.2 は勧告として確定済みであり、
ロール・プロパティの定義は変更されない。手動仕様ファイル内のバージョン固有
オーバーライド（例: `"1.1": { "permittedRoles": [...] }`）は、これらの確定した
バージョンの動作を保持するために存在する。WAI-ARIA 1.3 はまだ草案段階であり、
`yarn up:gen` による ARIA 変更の主な発生源である

### 7. 定期的な仕様更新

本パッケージの仕様データは、`index.json` を再生成することで最新の MDN・W3C データを
取り込む。これがウェブ標準の変更を反映するための標準的なワークフローである。

**ステップ 1: 再生成して差分を確認**

```bash
yarn up:gen
git diff packages/@markuplint/html-spec/index.json
```

`index.json` に最新の MDN スクレイピング結果が反映される。差分をレビューして
何が変更されたか把握する。典型的な変更内容:

- **description の些細な表現変更** -- MDN は要素・属性・ロールの説明文を頻繁に
  修正する。これらは表面的な変更であり、そのままコミットしてよい
- **新しい属性の追加** -- 新たに標準化された、または experimental な属性が MDN
  から取得される（例: `interestfor`, `switch`）。MDN スクレイピング由来のため、
  手動仕様ファイルの変更は不要
- **フラグの変更** -- 標準化の進行に伴い、属性が `experimental`、`deprecated`、
  `nonStandard` 間で遷移することがある
- **仕様の実質的な変更** -- 例えば、ARIA プロパティが `required` から `inherited`
  に変更される、コンテンツモデルが再構成されるなど
- **ARIA の変更** -- `index.json` の ARIA ロール・プロパティ定義は W3C 仕様から
  スクレイピングされる。WAI-ARIA 1.1 と 1.2 は勧告（Recommendation）として
  確定済みであり、変更されることはない。一方、WAI-ARIA 1.3 はまだ草案
  （Working Draft）段階であるため、`yarn up:gen` を実行するたびに新しいロール定義、
  プロパティ要件、description の更新が取り込まれる可能性がある

**ステップ 2: 些細な変更の処理**

description の表現変更などの表面的な変更は、更新された `index.json` をそのまま
コミットすればよい。これらは上流の改善を反映したものであり、そのまま受け入れる。

> **注意 -- ARIA バージョンの重複:** `index.json` には WAI-ARIA 1.1、1.2、1.3 の
> ロール定義が含まれるため、多くの文字列が 3 回出現する。description やプロパティ
> を編集する際、**`replace_all` を使用しないこと** -- 3 つのバージョンすべてが
> 同時に変更されてしまう。変更対象のバージョンブロックを個別に指定すること。

**ステップ 3: 仕様の実質的な変更の処理**

差分に要素の動作、ARIA マッピング、コンテンツモデルに関する実質的な変更が含まれる
場合、手動仕様ファイルの更新が必要になることがある:

1. 影響を受ける要素を特定する
2. 該当する `src/spec.*.json` または `src/spec-common.*.json` を新しい仕様に合わせて
   更新する。まれに `@markuplint/ml-spec` のスキーマや型定義の更新が必要になる
   こともある
3. 手動仕様の変更を反映するために再生成する:
   ```bash
   yarn up:gen
   ```
4. **冪等性の検証** -- 仕様ファイルの変更が安定した出力を生成することをコミット前に確認する:
   ```bash
   # 仕様ファイルと index.json をステージ
   git add packages/@markuplint/html-spec/src/spec.*.json packages/@markuplint/html-spec/index.json
   # 再生成
   yarn up:gen
   # 変更した属性が diff に出ないことを確認（= 安定した出力）
   git diff packages/@markuplint/html-spec/index.json | grep '"your-attr"'
   # 安定していれば再生成ファイルを破棄し、ステージ済みの版を使う
   git checkout packages/@markuplint/html-spec/index.json
   ```
   diff に予期しない変更が出る場合、仕様ファイルとジェネレータの出力が一致していない
   ことを意味する -- コミット前に原因を調査すること。

**ステップ 4: コミットと PR**

`index.json`（および変更した `src/` ファイルがあればそれも）をステージしてコミットする。

変更の性質に応じた conventional commit プレフィックスを使用する:

| 変更種別             | プレフィックス | 例                                                |
| -------------------- | -------------- | ------------------------------------------------- |
| description 更新のみ | `chore`        | `chore(html-spec): update role descriptions`      |
| 属性追加・仕様変更   | `feat`         | `feat(html-spec): add input switch attribute`     |
| spec データ修正      | `fix`          | `fix(html-spec): correct ARIA mapping for button` |

**PR の分離:** 仕様変更（新属性の追加、ARIA マッピング修正など）はそれぞれ個別の
ブランチ・PR で作成する。description のみの更新は 1 つの PR にまとめてよい。

このプロセスは多少複雑だが、差分をレビューすることでウェブ標準の変更内容を把握でき、
仕様データの正確性を維持するために重要である。

### 8. 要素を非推奨としてマーク

要素を非推奨にする方法は2つある:

- **ハードコードリスト経由**: `packages/@markuplint/spec-generator/src/html-elements.ts` の `obsoleteList` 配列に要素名を追加
- **手動仕様経由**: 要素の仕様ファイルに `"obsolete": true` を設定

非推奨要素には自動的に以下が設定される:

- HTML仕様の非準拠機能セクションを指す `cite`
- `contents: true`（任意のコンテンツ許可）
- `permittedRoles: true`, `implicitRole: false`

## ファイル分類

### 編集可能なファイル（これらを変更）

| ファイル                          | 説明                                               |
| --------------------------------- | -------------------------------------------------- |
| `src/spec.*.json`                 | 要素ごとの仕様（177ファイル）                      |
| `src/spec-common.attributes.json` | グローバル属性カテゴリ定義（19カテゴリ）           |
| `src/spec-common.contents.json`   | コンテンツモデルカテゴリマクロ（HTML 10 + SVG 19） |
| `build.mjs`                       | ビルドスクリプト設定                               |

### 生成ファイル（編集不可）

| ファイル     | 説明                      |
| ------------ | ------------------------- |
| `index.json` | 統合仕様出力（48K行以上） |

このファイルは `yarn workspace @markuplint/html-spec run gen` によって再生成される。手動で編集した内容は次回の生成時にすべて上書きされる。

### 静的ファイル

| ファイル     | 説明                      |
| ------------ | ------------------------- |
| `index.js`   | CommonJS エントリポイント |
| `index.d.ts` | TypeScript 型宣言         |

## テスト

### スキーマ検証テスト

テストファイル `test/structure.spec.mjs` は以下を検証する:

1. **構造テスト**: 全要素が `resolveNamespace()` と `getAttrSpecsByNames()` で解決可能であること
2. **スキーマテスト**: ソースJSONファイルが `@markuplint/ml-spec` のJSONスキーマに対して有効であること

テスト実行:

```bash
yarn workspace @markuplint/html-spec run test
```

スキーマテストでは以下のスキーマが使用される:

| スキーマ                        | 対象                              |
| ------------------------------- | --------------------------------- |
| `element.schema.json`           | `src/spec.*.json` ファイル        |
| `global-attributes.schema.json` | `src/spec-common.attributes.json` |
| `attributes.schema.json`        | 属性定義の部分スキーマ            |
| `types.schema.json`             | 型定義の部分スキーマ              |
| `aria.schema.json`              | ARIA定義の部分スキーマ            |
| `content-models.schema.json`    | コンテンツモデルの部分スキーマ    |

## 依存関係管理

### 本番依存

- **`@markuplint/ml-spec`**: 型定義とJSONスキーマを提供。`ExtendedSpec` 型が `index.json` の構造を規定する

### 開発依存

- **`@markuplint/spec-generator`**: ビルドツール。外部データのスクレイピングとマージを担当
- **`@markuplint/test-tools`**: テストユーティリティ。`glob` 関数などを提供

### 依存関係更新時の注意

1. `@markuplint/spec-generator` 更新後は必ず再生成を実行
2. `index.json` の差分を注意深くレビュー（外部データソースの変更により予期しない差分が出る場合がある）
3. テストを実行してスキーマ検証が通ることを確認
4. `@markuplint/ml-spec` のスキーマが変更された場合、ソースJSONファイルの更新が必要になることがある

## トラブルシューティング

### ビルド失敗: 生成中のネットワークエラー

**症状**: `gen:build` がフェッチエラーで失敗する

**原因**: MDNまたはW3Cサーバーに到達できない、またはページ構造が変更された

**解決策**: ネットワーク接続を確認する。失敗したフェッチは空文字列としてキャッシュされるため、一部のデータが欠損した状態で生成が完了する場合がある。安定したネットワーク環境で再実行すること。

### スキーマ検証エラー

**症状**: テストが "X is invalid" エラーで失敗する

**原因**: 仕様ファイルがJSONスキーマに準拠していない

**解決策**: エラーメッセージに含まれるファイル名を特定し、`@markuplint/ml-spec` の対応するスキーマに対してファイルの内容を検証する。一般的な原因には、未知のフィールド名、不正な型、必須フィールドの欠落がある。

### index.json の予期しない変更

**症状**: 再生成後に予期しない追加・削除がある

**原因**: 外部データソース（MDN, W3C）が更新された。MDNのページ構造変更やARIA仕様の改訂により、スクレイピング結果が変わることがある。

**解決策**: 変更を注意深くレビューする。不正な変更は手動仕様ファイルでオーバーライドできる。手動仕様のデータはMDNスクレイピングデータよりも常に優先される。

### 再生成後に要素が消失

**症状**: `index.json` から要素が消える

**原因**: ソース仕様ファイルが削除されたか、命名規則に違反している

**解決策**: `src/spec.<element>.json` ファイルの存在と命名を確認する。HTML要素は `spec.<tag>.json`、SVG要素は `spec.svg_<localname>.json` の命名規則に従う必要がある。

### ビルド時間が長い

**症状**: `gen:build` の完了に数分以上かかる

**原因**: 200以上のHTTPリクエストがMDNおよびW3Cに送信される。ネットワーク速度に依存する。

**解決策**: キャッシュは実行ごとにリセットされるため、ビルド間の永続キャッシュは存在しない。安定した高速ネットワーク環境での実行を推奨する。

## データの優先順位

仕様生成時に手動仕様とスクレイピングデータが重複する場合、以下の優先順位が適用される:

| データ         | ソース          | 優先度                     |
| -------------- | --------------- | -------------------------- |
| `contentModel` | 手動仕様のみ    | 最高（スクレイピングなし） |
| `aria`         | 手動仕様のみ    | 最高（スクレイピングなし） |
| `globalAttrs`  | 手動仕様のみ    | 最高（スクレイピングなし） |
| `attributes`   | 手動仕様 + MDN  | 手動が優先、MDNが補完      |
| `description`  | MDN             | MDNのみ                    |
| `categories`   | MDN             | MDNのみ                    |
| `cite`         | 手動仕様 or MDN | 手動仕様があれば優先       |
| 互換性フラグ   | 手動仕様 + MDN  | 手動が優先、MDNが補完      |

手動仕様で定義された属性は、同名のMDN由来属性よりも常に優先される。MDNから取得された属性は、手動仕様に存在しない属性の補完にのみ使用される。

## 関連ドキュメント

| ドキュメント                                             | 内容                                                             |
| -------------------------------------------------------- | ---------------------------------------------------------------- |
| [build-pipeline.md](./build-pipeline.md)                 | ビルドパイプラインの詳細なアーキテクチャと外部データソースの解説 |
| [element-spec-format.md](./element-spec-format.md)       | 要素仕様JSONファイルのフォーマットリファレンス（英語）           |
| [element-spec-format.ja.md](./element-spec-format.ja.md) | 要素仕様JSONファイルのフォーマットリファレンス（日本語）         |

## チェックリスト

仕様ファイルの変更をコミットする前に、以下を確認すること:

- [ ] ソースJSONファイルの構文が正しい（JSONコメントは `//` 形式のみ対応）
- [ ] `yarn workspace @markuplint/html-spec run gen` が正常に完了する
- [ ] `yarn workspace @markuplint/html-spec run test` が全テストをパスする
- [ ] `index.json` の差分が意図した変更のみを含む
- [ ] 新規要素の場合、ファイル命名規則に従っている
- [ ] ARIA マッピングが最新の WAI-ARIA 仕様と整合している
