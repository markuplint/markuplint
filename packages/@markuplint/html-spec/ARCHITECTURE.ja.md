# @markuplint/html-spec

## 概要

`@markuplint/html-spec` は HTML Living Standard のデータセットプロバイダです。TypeScript ソースコードを含まない純粋なデータパッケージであり、208 個の要素 JSON 仕様ファイル（HTML、SVG、MathML）と 2 個の共通定義ファイルから構成されます。

ビルド時に `generator/` のスクリプトが外部ソース（MDN、W3C ARIA 1.1/1.2/1.3、HTML Living Standard、SVG 仕様、MathML 仕様）からデータをフェッチし、手動で管理されたローカル仕様とマージして、統合された `index.json`（48,000 行以上、約 1.4MB）を生成します。手動データは常に外部データより優先され、仕様の正確性を保証します。

## ディレクトリ構成

```
src/
├── spec.a.jsonc                      # <a> 要素の仕様
├── spec.abbr.jsonc                   # <abbr> 要素の仕様
├── ... (計 208 個の要素仕様ファイル)
├── spec.svg_text.jsonc               # <svg:text> 要素の仕様
├── spec.mml_math.jsonc               # <mml:math> 要素の仕様
├── spec-common.attributes.jsonc      # 20 個のグローバル属性カテゴリ定義
└── spec-common.contents.jsonc        # HTML 10 + SVG 19 + MathML 3 のコンテンツモデルカテゴリ定義

build.ts                              # generator/ モジュールを呼び出すビルドスクリプト
index.json                            # 生成出力（48K 行以上、編集不可）
index.js                              # CommonJS エントリーポイント
index.d.ts                            # TypeScript 型宣言
test/
└── structure.spec.mjs                # スキーマ検証テスト
```

## アーキテクチャ図

```mermaid
flowchart TD
    subgraph sources ["ソースデータ"]
        specFiles["src/spec.*.jsonc\n(177 個の要素仕様)"]
        commonAttrs["src/spec-common.attributes.jsonc\n(19 グローバル属性カテゴリ)"]
        commonContents["src/spec-common.contents.jsonc\n(HTML 10 + SVG 19 + MathML 3 コンテンツモデル)"]
    end

    subgraph build ["ビルドパイプライン"]
        buildMjs["build.mjs"]
        specGen["generator/\nmain()"]
    end

    subgraph external ["外部データソース"]
        mdn["MDN Web Docs"]
        aria["W3C ARIA\n(1.1 / 1.2 / 1.3)"]
        htmlLs["HTML Living Standard"]
        svg["SVG 仕様"]
        mathml["MathML 仕様"]
    end

    subgraph output ["生成出力"]
        indexJson["index.json\n(48K+ 行、統合データセット)"]
    end

    subgraph consumers ["利用パッケージ"]
        mlCore["@markuplint/ml-core"]
        rules["@markuplint/rules"]
        mlSpec["@markuplint/ml-spec"]
    end

    specFiles --> buildMjs
    commonAttrs --> buildMjs
    commonContents --> buildMjs
    buildMjs --> specGen

    mdn --> specGen
    aria --> specGen
    htmlLs --> specGen
    svg --> specGen
    mathml --> specGen

    specGen -->|"手動データ優先で\n外部データとマージ"| indexJson

    indexJson --> mlSpec
    indexJson --> mlCore
    indexJson --> rules
```

## データ構造

`index.json` は 3 つのトップレベルキーで構成されます。

### `cites`

生成プロセス中にフェッチされた全 URL のソート済みリストです。データの出所を追跡するために使用されます。

### `def`

グローバル定義を格納するオブジェクトです。

| キー             | 内容                                                                   |
| ---------------- | ---------------------------------------------------------------------- |
| `#globalAttrs`   | 20 個のグローバル属性カテゴリ（`#HTMLGlobalAttrs` 等）                 |
| `#aria`          | バージョン別 ARIA 定義（1.1, 1.2, 1.3）                                |
| `#contentModels` | コンテンツモデルカテゴリマクロ（HTML 10 + SVG 19 + MathML 3 カテゴリ） |

### `specs`

全要素仕様の配列です。各要素は `contentModel`、`globalAttrs`、`attributes`、`aria` などのフィールドを持ちます。

TypeScript 型は `index.d.ts` で以下のように宣言されます。

```typescript
import type { Cites, ElementSpec, SpecDefs } from '@markuplint/ml-spec';

declare const json: {
  cites: Cites;
  def: SpecDefs;
  specs: ElementSpec[];
};

export = json;
```

## 主要コンポーネント

| コンポーネント | ファイル                                | 説明                                                          |
| -------------- | --------------------------------------- | ------------------------------------------------------------- |
| ソース仕様     | `src/spec.*.jsonc`（208 ファイル）      | 要素ごとの仕様定義（コンテンツモデル、属性、ARIA マッピング） |
| 共通定義       | `src/spec-common.*.jsonc`（2 ファイル） | グローバル属性カテゴリとコンテンツモデルマクロの共有定義      |
| ビルドシステム | `build.ts`                              | `generator/` の `main()` を呼び出すエントリー                 |
| 生成出力       | `index.json`                            | 統合データセット（48K 行以上、直接編集不可）                  |
| 型宣言         | `index.d.ts`                            | `@markuplint/ml-spec` からの型を再エクスポート                |
| スキーマ検証   | `test/structure.spec.mjs`               | Ajv ベースの JSON スキーマ検証テスト                          |

## 要素仕様のフォーマット

各 `src/spec.*.jsonc` ファイルは以下の構造を持ちます（例: `spec.a.jsonc`）。

```jsonc
// https://html.spec.whatwg.org/multipage/text-level-semantics.html#the-a-element
{
  "contentModel": {
    "contents": [
      {
        "transparent": ":not(:model(interactive), a, [tabindex])"
      }
    ]
  },
  "globalAttrs": {
    "#HTMLGlobalAttrs": true,
    "#GlobalEventAttrs": true,
    "#ARIAAttrs": true,
    "#HTMLLinkAndFetchingAttrs": ["href", "target", "download", "ping", "rel", "hreflang", "type", "referrerpolicy"]
  },
  "attributes": {},
  "aria": {
    "implicitRole": "link",
    "permittedRoles": ["button", "checkbox", "menuitem", ...],
    "properties": { ... },
    "conditions": { ... }
  }
}
```

主要フィールドの説明:

| フィールド     | 説明                                                                        |
| -------------- | --------------------------------------------------------------------------- |
| `contentModel` | 許可される子要素のパターン定義                                              |
| `globalAttrs`  | 使用するグローバル属性カテゴリのマッピング（`true` で全属性、配列で選択的） |
| `attributes`   | 要素固有の属性定義                                                          |
| `aria`         | ARIA マッピング（暗黙ロール、許可ロール、プロパティ、条件分岐）             |

## 共通定義ファイル

### `spec-common.attributes.jsonc`

19 個のグローバル属性カテゴリを定義します。カテゴリキーは `#` プレフィックスで参照されます。

| カテゴリキー                | 内容                                               |
| --------------------------- | -------------------------------------------------- |
| `#HTMLGlobalAttrs`          | `accesskey`, `contenteditable`, `dir` 等の標準属性 |
| `#GlobalEventAttrs`         | `onclick`, `onload` 等のイベントハンドラ属性       |
| `#ARIAAttrs`                | `aria-*` 属性群                                    |
| `#HTMLLinkAndFetchingAttrs` | `href`, `target`, `download` 等のリンク関連属性    |

### `spec-common.contents.jsonc`

コンテンツモデルカテゴリのマクロ定義です。

- **HTML カテゴリ**（10 個）: `#metadata`, `#flow`, `#sectioning`, `#heading`, `#phrasing`, `#embedded`, `#interactive`, `#palpable`, `#scriptSupporting`, `#formAssociated`
- **SVG カテゴリ**（19 個）: `#SVGAnimation`, `#SVGDescriptive`, `#SVGShape`, `#SVGStructural` 等
- **MathML カテゴリ**（3 個）: `#MathMLPresentation`, `#MathMLScript`, `#MathMLTabular`

## ビルドパイプライン

ビルドは `build.ts` を通じて `generator/` の `main()` 関数を呼び出します。

ビルドプロセスの流れ:

1. `src/spec.*.jsonc` と `src/spec-common.*.jsonc` を読み込む
2. MDN、W3C ARIA（1.1/1.2/1.3）、HTML Living Standard、SVG 仕様、MathML 仕様から外部データをフェッチ
3. 手動仕様と外部データをマージ（手動データが優先）
4. 統合された `index.json` を出力

ビルドコマンド:

```bash
# 生成 + フォーマット
yarn gen

# 生成のみ
yarn gen:build

# フォーマットのみ
yarn gen:prettier
```

## テスト

`test/structure.spec.mjs` は以下の検証を行います。

1. **構造テスト**: 全要素仕様に対して `resolveNamespace()` と `getAttrSpecsByNames()` を呼び出し、属性仕様の整合性を確認
2. **スキーマ検証**: Ajv を使用して各ソース JSON ファイルが `@markuplint/ml-spec` の JSON スキーマに適合することを検証
   - `spec.*.jsonc` → `element.schema.json`（+ 関連スキーマ）
   - `spec-common.attributes.jsonc` → `global-attributes.schema.json`

## 外部依存パッケージ

| パッケージ               | 種別 | 用途                                         |
| ------------------------ | ---- | -------------------------------------------- |
| `@markuplint/ml-spec`    | 本番 | 型定義（`Cites`, `ElementSpec`, `SpecDefs`） |
| `@markuplint/test-tools` | 開発 | テストユーティリティ（`glob` 等）            |

## 他パッケージとの連携

```mermaid
flowchart LR
    subgraph upstream ["上流パッケージ"]
        specGen["generator/\n(ビルドパイプライン)"]
        mlSpecTypes["@markuplint/ml-spec\n(型定義)"]
    end

    subgraph pkg ["@markuplint/html-spec"]
        sourceData["ソース仕様\n(177 JSON + 2 共通)"]
        buildScript["build.mjs"]
        generatedJson["index.json"]
    end

    subgraph downstream ["下流パッケージ"]
        mlSpec["@markuplint/ml-spec\n(アルゴリズム)"]
        mlCore["@markuplint/ml-core"]
        rules["@markuplint/rules"]
        fwSpecs["フレームワーク仕様パッケージ\n(vue-spec, react-spec 等)"]
    end

    mlSpecTypes -->|"型定義\n(index.d.ts)"| pkg
    specGen -->|"main()\n(ビルド時)"| buildScript
    sourceData --> buildScript
    buildScript --> generatedJson

    generatedJson -->|"MLMLSpec JSON\n(ベースデータ)"| mlSpec
    generatedJson -->|"要素仕様\nARIA 定義"| mlCore
    generatedJson -->|"リントルール\nの参照データ"| rules
    generatedJson -->|"拡張のベース"| fwSpecs
```

### 上流

- **`@markuplint/ml-spec`** は `index.d.ts` で使用される型定義（`Cites`, `ElementSpec`, `SpecDefs`）を提供します。
- **`generator/`** はビルド時に外部仕様のフェッチとデータ統合を担当します。

### 下流

- **`@markuplint/ml-spec`** は生成された `index.json` をベース `MLMLSpec` データとして読み込み、ARIA/HTML アルゴリズムに供給します。
- **`@markuplint/ml-core`** は要素仕様と ARIA 定義を使用して、仕様認識を持つドキュメント表現を構築します。
- **`@markuplint/rules`** は仕様データを参照してリントルール（ロール検証、コンテンツモデルチェック等）を実装します。
- **フレームワーク仕様パッケージ**（`@markuplint/vue-spec`, `@markuplint/react-spec` 等）は `index.json` のデータをベースとして、フレームワーク固有の要素や属性を拡張します。

## ドキュメントマップ

- [要素仕様フォーマット](docs/element-spec-format.ja.md) -- 要素 JSON の構造、フィールド定義、条件分岐パターン
- [ビルドパイプライン](docs/build-pipeline.ja.md) -- generator の動作、外部データフェッチ、マージ戦略
- [メンテナンスガイド](docs/maintenance.ja.md) -- 新規要素の追加、属性更新、外部仕様の変更対応
