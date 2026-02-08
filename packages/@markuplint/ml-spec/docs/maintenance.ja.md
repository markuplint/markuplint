# メンテナンスガイド

## 概要

このガイドでは、`@markuplint/ml-spec` の日常的な運用・メンテナンスタスクについて説明します。スキーマ生成、依存関係管理、テスト、よく使うレシピ、トラブルシューティングを対象とします。

## ビルド・開発コマンド

| コマンド                                        | スコープ   | 説明                                   |
| ----------------------------------------------- | ---------- | -------------------------------------- |
| `yarn build --scope @markuplint/ml-spec`        | パッケージ | TypeScript を `lib/` にコンパイル      |
| `yarn workspace @markuplint/ml-spec run dev`    | パッケージ | ウォッチモードコンパイル               |
| `yarn workspace @markuplint/ml-spec run clean`  | パッケージ | `lib/` 出力を削除                      |
| `yarn workspace @markuplint/ml-spec run schema` | パッケージ | スキーマと型を再生成                   |
| `yarn up:schema`                                | モノレポ   | 全パッケージのスキーマを再生成（推奨） |
| `yarn test`                                     | モノレポ   | vitest で全テストを実行                |

## スキーマ生成パイプライン

### スキーマ生成が存在する理由

本パッケージは JSON Schema ファイルを複雑な型構造（ARIA 定義、属性型、コンテンツモデル、グローバル属性）の唯一の情報源として使用しています。TypeScript 型はこれらのスキーマから `json-schema-to-typescript`（`json2ts`）によって自動生成されます。これにより:

- ランタイムで消費される JSON データファイルが、TypeScript 型と同じ構造に対して検証される。
- スキーマの変更が自動的に型定義に伝播する。
- `@markuplint/html-spec` の JSON データが型システムと一貫性を保つ。

### 生成フロー

```
gen/global-attribute.data.ts   schemas/aria.schema.json
         │                     schemas/content-models.schema.json
         ▼                              │
    gen/gen.ts                          │
         │                              │
         ▼                              ▼
schemas/global-attributes.schema.json   │
schemas/attributes.schema.json          │
         │                              │
         └──────────┬───────────────────┘
                    ▼
          json-schema-to-typescript
                    │
         ┌──────────┼──────────────┐
         ▼          ▼              ▼
  types/aria.ts  types/        types/permitted-
              attributes.ts    structures.ts
                    │
                    ▼
          prettier + eslint
```

### スクリプトの内訳 (`yarn workspace @markuplint/ml-spec run schema`)

`schema` スクリプトは `run-s` による逐次パイプラインです:

```
schema:json → schema:content-models → schema:attributes → schema:aria → schema:prettier → schema:eslint → schema:prettier
```

| ステップ                | コマンド                                                   | 入力                                 | 出力                                                                      |
| ----------------------- | ---------------------------------------------------------- | ------------------------------------ | ------------------------------------------------------------------------- |
| `schema:json`           | `tsx ./gen/gen.ts`                                         | `gen/global-attribute.data.ts`       | `schemas/global-attributes.schema.json`, `schemas/attributes.schema.json` |
| `schema:content-models` | `json2ts ./schemas/content-models.schema.json`             | `schemas/content-models.schema.json` | `src/types/permitted-structures.ts`                                       |
| `schema:attributes`     | `json2ts ./schemas/attributes.schema.json --cwd ./schemas` | `schemas/attributes.schema.json`     | `src/types/attributes.ts`                                                 |
| `schema:aria`           | `json2ts ./schemas/aria.schema.json --cwd ./schemas`       | `schemas/aria.schema.json`           | `src/types/aria.ts`                                                       |
| `schema:prettier`       | `prettier --write`                                         | `schemas/*.json`, `src/types/*.ts`   | フォーマット済みファイル                                                  |
| `schema:eslint`         | `eslint --fix`                                             | `src/types/*.ts`                     | lint 修正済みファイル                                                     |

注意: `schema:prettier` は **2回** 実行されます -- `schema:aria` の後に生成ファイルをフォーマットし、`schema:eslint` の後に eslint の自動修正によるフォーマット変更をクリーンアップします。

### パッケージ間依存: `@markuplint/types`

`schemas/attributes.schema.json` は `@markuplint/types` への `$ref` を含みます:

```json
{
  "AttributeType": {
    "$ref": "../../types/types.schema.json#/definitions/type"
  }
}
```

つまり、`@markuplint/types` が `@markuplint/ml-spec` **より先に**スキーマを再生成する必要があります。モノレポレベルの `yarn up:schema` はこの順序を自動的に処理します:

1. `@markuplint/types` -- `types.schema.json` を生成し、パッケージをビルド
2. `@markuplint/ml-spec` -- `types.schema.json` を参照するスキーマを生成
3. `schema` スクリプトを持つその他のパッケージ

**パッケージ間参照を含むスキーマ更新時は、常にリポジトリルートから `yarn up:schema` を使用してください。**

## ファイル分類: 編集可能 vs 生成

### 直接編集してはいけないファイル

これらのファイルには「DO NOT MODIFY」ヘッダーがあり、生成パイプラインによって上書きされます:

| ファイル                                | 生成元                                        |
| --------------------------------------- | --------------------------------------------- |
| `src/types/aria.ts`                     | `schemas/aria.schema.json`                    |
| `src/types/attributes.ts`               | `schemas/attributes.schema.json`              |
| `src/types/permitted-structures.ts`     | `schemas/content-models.schema.json`          |
| `schemas/global-attributes.schema.json` | `gen/gen.ts` + `gen/global-attribute.data.ts` |
| `schemas/attributes.schema.json`        | `gen/gen.ts` + `gen/global-attribute.data.ts` |

### 生成出力を変更するために編集するファイル

| 変更したいもの                           | 編集するファイル                         | 実行コマンド                                    |
| ---------------------------------------- | ---------------------------------------- | ----------------------------------------------- |
| グローバル属性カテゴリ/項目              | `gen/global-attribute.data.ts`           | `yarn workspace @markuplint/ml-spec run schema` |
| `AttributeJSON` の形状（フィールド追加） | `gen/gen.ts`（`AttributeJSON` 定義部分） | `yarn workspace @markuplint/ml-spec run schema` |
| ARIA ロール/プロパティ構造               | `schemas/aria.schema.json`               | `yarn workspace @markuplint/ml-spec run schema` |
| コンテンツモデルパターン                 | `schemas/content-models.schema.json`     | `yarn workspace @markuplint/ml-spec run schema` |
| 属性値型（CSS キーワード等）             | `@markuplint/types` パッケージ           | `yarn up:schema`（ルートから）                  |

### 直接編集するファイル（手書き）

| ファイル                      | 目的                                                       |
| ----------------------------- | ---------------------------------------------------------- |
| `src/types/index.ts`          | コア手書き型（`MLMLSpec`, `ElementSpec`, `ARIARole` など） |
| `src/algorithm/aria/*.ts`     | ARIA アルゴリズム実装                                      |
| `src/algorithm/html/*.ts`     | HTML アルゴリズム実装                                      |
| `src/utils/*.ts`              | ユーティリティ関数                                         |
| `src/index.ts`                | 公開 API エクスポート                                      |
| `schemas/element.schema.json` | トップレベル要素スキーマ（手書き、11行）                   |

## テスト

### テストファイル

パッケージには vitest を使用する 15 のテストファイルがあります:

| ディレクトリ          | テストファイル数 | カバレッジ                                                                                                                                                                                                                             |
| --------------------- | ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/algorithm/aria/` | 11               | `accname-computation`, `get-computed-aria-props`, `get-computed-role`, `get-implicit-role-spec`, `get-implicit-role`, `get-permitted-roles-spec`, `get-role-spec`, `has-required-owned-elements`, `is-exposed`, `matches-context-role` |
| `src/utils/`          | 4                | `get-attr-specs-spec`, `get-spec-by-tag-name`, `resolve-namespace`, `resolve-version`, `schema-to-spec`                                                                                                                                |

### テストの実行

```bash
# モノレポ全体のテスト
yarn test

# ml-spec のテストのみ
yarn test packages/@markuplint/ml-spec

# 特定のテストファイル
yarn test packages/@markuplint/ml-spec/src/algorithm/aria/get-computed-role.spec.ts
```

テストは `@markuplint/test-tools`（devDependency）に依存しており、テスト環境で DOM 要素を生成するための HTML パースユーティリティを提供します。

## 依存関係管理

### ランタイム依存

| パッケージ              | バージョン | 目的                               | 更新リスク         |
| ----------------------- | ---------- | ---------------------------------- | ------------------ |
| `@markuplint/ml-ast`    | 4.4.10     | `NamespaceURI` 型                  | 低（内部）         |
| `@markuplint/types`     | 4.8.1      | 属性値型の `Type` ユニオン         | 中（スキーマ参照） |
| `dom-accessibility-api` | 0.7.1      | AccName 計算                       | 中（仕様準拠）     |
| `is-plain-object`       | 5.0.0      | AAM 情報のプレーンオブジェクト検出 | 低（安定 API）     |
| `type-fest`             | 4.41.0     | `ReadonlyDeep` ユーティリティ型    | 低（型のみ）       |

### 開発依存

| パッケージ                  | バージョン | 目的                               |
| --------------------------- | ---------- | ---------------------------------- |
| `@markuplint/test-tools`    | 4.5.22     | DOM 要素生成のテストユーティリティ |
| `json-schema-to-typescript` | 15.0.4     | スキーマ → TypeScript 型生成       |

### 依存関係の更新

- **`dom-accessibility-api`**: 更新により AccName 計算の動作が変わる場合があります。更新後は `accname-computation.spec.ts` テストを実行してください。
- **`json-schema-to-typescript`**: メジャーバージョン更新により、生成される型の出力が変わる場合があります（フォーマット、optional の扱い）。更新後は `yarn workspace @markuplint/ml-spec run schema` を実行し、`src/types/*.ts` の差分を確認してください。
- **`@markuplint/types`**: 更新後は必ず `yarn up:schema` を実行して、スキーマ参照の一貫性を確保してください。
- **`type-fest`**: 型のみの依存です。自由に更新できますが、ビルドが成功することを確認してください（`yarn build --scope @markuplint/ml-spec`）。

## よく使うメンテナンスレシピ

### 1. 新しいグローバル属性を追加する

`gen/global-attribute.data.ts` を編集し、適切なカテゴリ配列に属性名を追加します:

```ts
'#HTMLGlobalAttrs': {
  attrs: [
    // ...既存の属性...
    'newattribute',  // ← ここに追加
  ],
},
```

再生成を実行:

```bash
yarn workspace @markuplint/ml-spec run schema
```

### 2. 新しいグローバル属性カテゴリを追加する

`gen/global-attribute.data.ts` を編集し、新しいエントリを追加します:

```ts
'#NewCategoryAttrs': {
  description: '仕様リンク付きの説明',
  attrs: ['attr1', 'attr2'],
},
```

キーは `#${string}Attrs` パターンに一致する必要があります。ジェネレータ（`gen/gen.ts`）は `global-attributes.schema.json` と `attributes.schema.json` の両方で新しいカテゴリを自動的に処理します。

再生成を実行:

```bash
yarn workspace @markuplint/ml-spec run schema
```

### 3. `AttributeJSON` に新しいフィールドを追加する

`gen/gen.ts` を編集し、`AttributeJSON` 定義オブジェクト内にプロパティを追加します:

```ts
AttributeJSON: {
  properties: {
    // ...既存のプロパティ...
    newField: { type: 'boolean' },  // ← ここに追加
  },
},
```

再生成すると、新しいフィールドが `src/types/attributes.ts` にオプショナルプロパティとして反映されます。

### 4. ARIA ロール/プロパティスキーマを変更する

`schemas/aria.schema.json` を直接編集します。例えば、ロール定義に新しいフィールドを追加する場合:

```json
{
  "definitions": {
    "role": {
      "properties": {
        "newField": { "type": "boolean" }
      }
    }
  }
}
```

再生成すると、新しいフィールドが `src/types/aria.ts` に反映されます。

### 5. 新しいコンテンツモデルカテゴリを追加する

`schemas/content-models.schema.json` を編集し、`Category` enum にカテゴリを追加してパターンを定義します。

### 6. 新しい ARIA アルゴリズム関数を追加する

1. `src/algorithm/aria/` に実装ファイルを作成。
2. 対応する `.spec.ts` テストファイルを作成。
3. `src/index.ts` から関数をエクスポート。
4. `docs/aria-algorithms.md` と `docs/aria-algorithms.ja.md` を更新。

### 7. W3C 仕様準拠を更新する

W3C 仕様が更新された場合（例: WAI-ARIA 1.3 が勧告になった場合）:

1. 要素レベルの ARIA マッピングが変更された場合、`@markuplint/html-spec` データを更新。
2. アルゴリズムの動作が変更された場合、`src/algorithm/aria/*.ts` のアルゴリズム実装を更新。
3. 新しい ARIA バージョンが追加された場合、`src/utils/aria-version.ts` を更新。
4. `yarn up:schema` を実行して型を再生成。
5. テストを実行して準拠を確認。

## キャッシュの考慮事項

パッケージは複数のランタイムキャッシュを使用しており、**プロセスのライフタイム中は無効化されません**。これは markuplint の単発実行リントモデルでは安全ですが、以下の点に注意してください:

| キャッシュ場所                                | スコープ                                        | 備考                       |
| --------------------------------------------- | ----------------------------------------------- | -------------------------- |
| `getARIA()` 内部キャッシュ                    | `Map`（`localName + namespace + version` キー） | プロセス再起動時のみクリア |
| `getSpecByTagName()` キャッシュ               | `Map`（`namespace:localName` キー）             | specs インスタンスごと     |
| `getContentModel()` キャッシュ                | `Map<Specs, Map<Element, ...>>`                 | ネスト、specs + 要素ごと   |
| `contentModelCategoryToTagNames()` キャッシュ | モジュールレベル `Map<Category, string[]>`      | グローバル、無効化なし     |
| `getAttrSpecs()` キャッシュ                   | `WeakSet` + `Map`（スキーマごと）               | 新しいスキーマでリセット   |
| `resolveNamespace()` キャッシュ               | モジュールレベル `Map`                          | グローバル、無効化なし     |

コストの高い結果を計算する新しいアルゴリズム関数を追加する場合は、要素 + specs + version をキーとする同様のキャッシュ戦略の追加を検討してください。

## バージョニングポリシー

- HTML Schema/Specs は markuplint の公開 API サーフェスの**一部ではありません**。
- スキーマ、生成型、アルゴリズム動作の変更は**マイナーリリース**として扱われます。
- パブリッシュは通常のリリースプロセスで Lerna によって処理されます。
- `package.json` の `version` フィールドは Lerna によって管理されます -- 手動で更新しないでください。

## トラブルシューティング

### スキーマ生成が `$ref` エラーで失敗する

**症状:** `json2ts` が `schema:attributes` 実行中に未解決の `$ref` を報告する。

**原因:** `../../types/types.schema.json` への `$ref` は、`@markuplint/types` が先にスキーマを生成している必要がある。

**対処:** パッケージレベルの `schema` スクリプトの代わりに、リポジトリルートから `yarn up:schema` を実行してください。

### `json-schema-to-typescript` 更新後に生成型が異なる

**症状:** `json-schema-to-typescript` の更新後、`src/types/*.ts` に予期しない変更がある。

**原因:** 新しいバージョンがフォーマット、optional の扱い、型生成戦略を変更した可能性がある。

**対処:** 差分を注意深く確認してください。型が意味的に同等であれば、変更をコミットしてください。動作が変わった場合（例: 以前 optional だったフィールドが required になった）、`json-schema-to-typescript` のチェンジログを調査してください。

### `dom-accessibility-api` 更新後のテスト失敗

**症状:** `dom-accessibility-api` の更新後、`accname-computation.spec.ts` が失敗する。

**原因:** ライブラリが AccName アルゴリズムの実装を更新し、計算されるアクセシブル名が変わった。

**対処:** [AccName 1.1 仕様](https://www.w3.org/TR/accname-1.1/)に照らして新しい動作を確認してください。ライブラリがより仕様準拠になった場合は、テストの期待値を更新してください。

### ビルドエラー: 生成型の不一致

**症状:** `src/types/aria.ts`、`attributes.ts`、`permitted-structures.ts` の型を参照する TypeScript ビルドエラー。

**原因:** JSON スキーマが編集されたが型が再生成されていない、またはパッケージ間のスキーマ参照が古い。

**対処:**

```bash
yarn up:schema
yarn build --scope @markuplint/ml-spec
```

### 長時間実行プロセスでのキャッシュ関連の問題

**症状:** 異なる設定で複数のリント実行を同じ Node.js プロセスで再利用した際に、古いデータが返される。

**原因:** モジュールレベルのキャッシュ（`contentModelCategoryToTagNames`、`resolveNamespace`）は無効化されない。

**対処:** これは markuplint の単発実行モデルのための設計です。markuplint を長時間実行プロセス（例: 言語サーバー）に組み込む場合、スペックデータは最初のアクセス時にキャッシュされることに注意してください。プロセスの再起動で全キャッシュがクリアされます。
