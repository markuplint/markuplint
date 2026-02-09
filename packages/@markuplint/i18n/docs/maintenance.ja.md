# @markuplint/i18n メンテナンスガイド

## 概要

`@markuplint/i18n` パッケージは、markuplint のルールメッセージの国際化を提供します。

- **ロケール辞書** (`locales/*.json`) — 言語ごとのキーワード、文テンプレート、リスト書式ルール
- **翻訳エンジン** (`src/translator.ts`) — テンプレートのキーワード置換、補語形式、リスト整形を処理
- **JSON Schema** (`$schema.json`) — 厳密なプロパティチェックでロケールファイルを検証

### ファイル構成

```
packages/@markuplint/i18n/
├── locales/
│   ├── ja.json          # 日本語辞書（完全版）
│   └── en.json          # 英語辞書（最小限のオーバーライド）
├── src/
│   ├── translator.ts    # 翻訳コアロジック
│   ├── types.ts         # LocaleSet, Translator 型定義
│   └── index.spec.ts    # テストスイート
├── $schema.json         # ロケール JSON Schema
└── package.json
```

## 3ファイル同期ルール

キーワードや文テンプレートを追加する際、3つのファイルを同期する必要があります。

| ファイル          | 役割                                                                                                                           | 必須？         |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------ | -------------- |
| `$schema.json`    | 許可されるプロパティキーを定義。`additionalProperties: false` のため、ここに定義されていないキーはバリデーションエラーになる。 | **常に必須**   |
| `locales/ja.json` | すべてのキーワードと文テンプレートの日本語翻訳。                                                                               | **常に必須**   |
| `locales/en.json` | 英語のオーバーライド。大文字化や特殊な書式が必要な場合のみ（例: `"html elements"` → `"HTML elements"`）。                      | 必要な場合のみ |

スキーマが有効なキーの定義元です。`ja.json` にキーワードを追加しても `$schema.json` に追加しなければ、ロケールファイルのスキーマ検証が失敗します。

## 単語を追加する

キーワードは、ルールメッセージの構成要素として使われる単語または短いフレーズです。ロケールファイルの `keywords` セクションに定義します。

### 手順

1. **`ja.json`** の `keywords` にアルファベット順で追加:

   ```json
   {
     "keywords": {
       "focusable": "フォーカス可能"
     }
   }
   ```

   - キーは英語の小文字
   - 値は日本語の翻訳

2. **`en.json`** の `keywords` には必要な場合のみ追加:

   ```json
   {
     "keywords": {
       "html elements": "HTML elements"
     }
   }
   ```

   ほとんどの英語キーワードはエントリ不要です。キーがそのまま使用されます。

3. **`$schema.json`** の `keywords.properties` に追加:

   ```json
   {
     "keywords": {
       "properties": {
         "focusable": { "type": "string" }
       }
     }
   }
   ```

4. **テスト**: `yarn test --scope @markuplint/i18n`
5. **ビルド**: `yarn build --scope @markuplint/i18n`

### 補語キーワード

補語キーワードは `c:` プレフィックスを使い、プレースホルダーに `:c` フラグ（例: `{0:c}`）が付いた場合に解決されます。日本語では主語に続く述語として機能します。

| ロケールのキー                           | テンプレートでの使用                         | 出力例（ja）                   |
| ---------------------------------------- | -------------------------------------------- | ------------------------------ |
| `"c:deprecated": "は非推奨です"`         | `"{0} is {1:c}"` + キーワード `"deprecated"` | `「要素」は非推奨です`         |
| `"c:disallowed": "は許可されていません"` | `"{0} is {1:c}"` + キーワード `"disallowed"` | `「属性」は許可されていません` |

補語キーワードを追加する際:

1. `ja.json` の keywords に `"c:<word>"` を追加
2. `$schema.json` の keywords properties に `"c:<word>"` を追加
3. 補語なしバージョン（`c:` なし）も別のキーワードとして必要な場合がある

## フレーズを追加する

文テンプレートは、プレースホルダー付きのメッセージパターンを定義します。ロケールファイルの `sentences` セクションに定義します。

### 手順

1. **英語テンプレート**をキーとして設計:

   ```
   "{0} conflicts with {1}"
   ```

   プレースホルダー構文:
   - `{0}`, `{1}`, `{2}` — 位置パラメータ、キーワードとして翻訳される
   - `{0:c}` — 補語フラグ、日本語では `c:` プレフィックスキーワードに解決
   - `{0*}` — 翻訳スキップ、値がキーワード検索なしでそのまま挿入される

2. **`ja.json`** の `sentences` に追加:

   ```json
   {
     "sentences": {
       "{0} conflicts with {1}": "{0}は{1}と競合しています"
     }
   }
   ```

   日本語の自然な語順にするため、プレースホルダーの順序は英語と異なってもよい。

3. **`$schema.json`** の `sentences.properties` に追加:

   ```json
   {
     "sentences": {
       "properties": {
         "{0} conflicts with {1}": { "type": "string" }
       }
     }
   }
   ```

4. **`en.json` に sentences エントリは不要**。英語のキー自体がテンプレートとして使用されます。翻訳が見つからない場合、translator はキーをそのまま使います。

5. **テスト**: `yarn test --scope @markuplint/i18n`

### プレースホルダーの並べ替え

日本語と英語では語順が異なります。文テンプレートを翻訳する際、プレースホルダーは自由に並べ替えできます:

- 英語: `"{0} is not allowed in {1}"`
- 日本語: `"{1}に{0}は許可されていません"`

プレースホルダーの番号は、translator に渡される引数の位置を指し、文字列内の位置ではありません。

## 新しい言語を追加する

まったく新しい言語のサポートを追加する手順です。

### 手順

1. **`locales/<lang>.json`** を `ja.json` をテンプレートにして作成:

   ```json
   {
     "$schema": "../$schema.json",
     "listFormat": {
       "quoteStart": "\"",
       "quoteEnd": "\"",
       "separator": ", "
     },
     "keywords": {
       "attribute": "<翻訳>",
       "element": "<翻訳>"
     },
     "sentences": {
       "{0} is {1}": "<翻訳テンプレート>"
     }
   }
   ```

   - `listFormat`: 言語に適した引用符と区切り文字を定義
   - `keywords`: `ja.json` のすべてのキーワードを翻訳
   - `sentences`: `ja.json` のすべての文テンプレートを翻訳

2. **`package.json`** にエクスポートエントリを追加:

   ```json
   {
     "exports": {
       "./locales/<lang>.json": {
         "import": "./locales/<lang>.json",
         "require": "./locales/<lang>.json"
       }
     }
   }
   ```

3. **`$schema.json` の変更は不要** — スキーマは全言語で共有されます。

4. **`src/index.spec.ts`** に新しいロケールのテストケースを追加。

5. **テスト**: `yarn test --scope @markuplint/i18n`

## コマンドリファレンス

| コマンド                              | 説明               |
| ------------------------------------- | ------------------ |
| `yarn test --scope @markuplint/i18n`  | テスト実行         |
| `yarn build --scope @markuplint/i18n` | パッケージのビルド |
