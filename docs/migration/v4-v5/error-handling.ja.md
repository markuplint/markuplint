# エラーハンドリング破壊的変更: v4 → v5 マイグレーションガイド

## 対象読者

- **カスタムルール作者** — markuplint パッケージのエラークラスを catch/throw しているコード
- **カスタムパーサー作者** — `ParserError` や `ConfigParserError` を throw しているコード
- **プラグイン開発者** — markuplint のエラークラスに対して `instanceof` チェックを行っているコード
- **Node.js API ユーザー** — リント結果をプログラムで処理し、エラー型を検査しているコード

CLI やエディタ拡張経由でのみ markuplint を使用している場合、**対応不要です**。

## 変更一覧

| 変更内容 | 影響範囲 | 要対応 |
|----------|---------|--------|
| `isFatalError()` ガード関数の追加 | catch ブロックを持つカスタムルール/プラグイン作者 | catch ブロックでの採用（推奨） |
| `@markuplint/selector` に `@markuplint/shared` 依存追加 | バージョンを厳密に固定しているユーザー | lockfile の更新 |

## エラークラスの import パス — 変更不要

エラークラスの定義は内部的に `@markuplint/shared` に集約されましたが、**import パスを変更する必要はありません**。各パッケージは引き続きエラークラスを公開 API としてエクスポートします。

用途に合ったパッケージからエラークラスを import してください:

```typescript
// ✅ カスタムパーサー — parser-utils から import
import { ParserError, TargetParserError, ConfigParserError } from '@markuplint/parser-utils';
import type { ParserErrorInfo } from '@markuplint/parser-utils';

// ✅ セレクタ関連 — selector から import
import { InvalidSelectorError } from '@markuplint/selector';

// ✅ 横断ユーティリティ（ガード関数など） — shared から import
import { isFatalError } from '@markuplint/shared';
```

### import ガイドライン

| クラス | 推奨 import 元 | ユースケース |
|--------|---------------|-------------|
| `ParserError`, `TargetParserError`, `ConfigParserError`, `ParserErrorInfo` | `@markuplint/parser-utils` | カスタムパーサー、パーサープラグイン |
| `InvalidSelectorError` | `@markuplint/selector` | セレクタ関連コード |
| `isFatalError()` | `@markuplint/shared` | エラー分類が必要な全ての `catch` ブロック |
| `ConfigLoadError`, `UnexpectedCallError` | `@markuplint/shared` | 内部・横断コード専用 |

**原則:** 作業中のドメインに対応するパッケージから import する。`@markuplint/shared` は `isFatalError()` のように特定ドメインに属さないユーティリティ、あるいは `ConfigLoadError` のようにドメイン固有パッケージを持たないエラークラスにのみ使用する。

## 新機能: `isFatalError()` ガード関数

`@markuplint/shared` から新しいガード関数 `isFatalError()` がエクスポートされました。[3階層エラーハンドリングポリシー](../architectures/ERROR-HANDLING.ja.md)に基づいてエラーを分類します。

### 動作

Tier 1（Fatal）— 実装バグや不変条件の破壊を示すエラーに対して `true` を返す:

- `TypeError`、`ReferenceError`、`RangeError`、`SyntaxError`
- `UnexpectedCallError`
- 非 `Error` の throw（文字列、`null`、`undefined` など）

Tier 2/3 — リカバリ可能なエラーに対して `false` を返す:

- `ParserError`、`TargetParserError`、`ConfigParserError`
- `ConfigLoadError`、`InvalidSelectorError`
- 汎用 `Error`

### Before（v4）

```typescript
// カスタムルールやプラグインのコード
try {
  // ... 何らかの処理
} catch (error) {
  if (error instanceof TypeError || error instanceof ReferenceError) {
    throw error;
  }
  // リカバリ可能なエラーの処理
}
```

### After（v5）

```typescript
import { isFatalError } from '@markuplint/shared';

try {
  // ... 何らかの処理
} catch (error) {
  if (isFatalError(error)) {
    throw error;
  }
  // リカバリ可能なエラーの処理
}
```

### 移行

これは**追加的な変更**であり、既存のコードは壊れません。カスタムルールやプラグインの `catch` ブロックで `isFatalError()` を採用し、Fatal エラーが握りつぶされないようにすることを推奨します。

## 新しい依存関係: `@markuplint/selector` → `@markuplint/shared`

`@markuplint/selector` が `@markuplint/shared`（バージョン `5.0.0-rc.0`）に依存するようになりました。`InvalidSelectorError` が `@markuplint/shared` で定義され、`@markuplint/selector` から re-export される形に変わったためです。

### 影響

- `@markuplint/selector` を単独で使用している場合、`@markuplint/shared` が推移的依存としてインストールされます
- API の変更はありません — `InvalidSelectorError` は引き続き `@markuplint/selector` から利用可能です

### 移行

`npm install` / `yarn install` で lockfile を更新してください。コード変更は不要です。

## エラークラス階層（リファレンス）

カスタムルール・パーサー作者向け、v5 での完全なエラークラス階層:

```
Error (組み込み)
├── ParserError                    — Tier 3: ユーザーのソースコード構文エラー
│   ├── TargetParserError          — Tier 3: 要素レベルのパースエラー
│   └── ConfigParserError          — Tier 3: 設定ファイルの構文エラー
├── ConfigLoadError                — Tier 2: 設定ファイルを読み込めない
├── InvalidSelectorError           — Tier 3: 設定内の CSS セレクタ構文エラー
└── UnexpectedCallError            — Tier 1: 内部 API 契約違反
```

階層定義とフロー図を含む完全なエラーハンドリングポリシーは[エラーハンドリングポリシー](../architectures/ERROR-HANDLING.ja.md)を参照してください。
