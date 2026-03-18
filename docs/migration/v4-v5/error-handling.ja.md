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
| エラークラスを `@markuplint/shared` に集約 | 全プラグイン/ルール/パーサー作者 | import パスの更新（推奨） |
| `isFatalError()` ガード関数の追加 | catch ブロックを持つカスタムルール/プラグイン作者 | catch ブロックでの採用（推奨） |
| `ConfigParserError` メッセージフォーマットのバグ修正 | エラーメッセージを文字列解析しているコード | 文字列マッチングの更新（該当する場合） |
| `@markuplint/selector` に `@markuplint/shared` 依存追加 | バージョンを厳密に固定しているユーザー | lockfile の更新 |

## エラークラスの import パス変更

全カスタムエラークラスが `@markuplint/shared` に移動しました。旧 import パスは re-export 経由で引き続き動作しますが、推奨 import パスが変わりました。

### Before（v4）

```typescript
import { ParserError, TargetParserError, ConfigParserError } from '@markuplint/parser-utils';
import type { ParserErrorInfo } from '@markuplint/parser-utils';
```

### After（v5）

```typescript
import { ParserError, TargetParserError, ConfigParserError } from '@markuplint/shared';
import type { ParserErrorInfo } from '@markuplint/shared';
```

### 移行テーブル

| クラス | v4 import 元 | v5 import 元（推奨） | v4 import は動作するか？ |
|--------|-------------|---------------------|------------------------|
| `ParserError` | `@markuplint/parser-utils` | `@markuplint/shared` | はい（re-export） |
| `TargetParserError` | `@markuplint/parser-utils` | `@markuplint/shared` | はい（re-export） |
| `ConfigParserError` | `@markuplint/parser-utils` | `@markuplint/shared` | はい（re-export） |
| `ParserErrorInfo`（型） | `@markuplint/parser-utils` | `@markuplint/shared` | はい（re-export） |
| `InvalidSelectorError` | `@markuplint/selector` | `@markuplint/shared` | はい（re-export） |
| `ConfigLoadError` | `@markuplint/file-resolver`（内部） | `@markuplint/shared` | はい（re-export） |
| `UnexpectedCallError` | `@markuplint/ml-core`（内部） | `@markuplint/shared` | はい（re-export） |

### なぜ更新すべきか？

旧 import は re-export により無期限に動作し続けます。しかし、以下の理由で更新を推奨します:

1. `@markuplint/shared` が正規のソース — 今後のドキュメントとサンプルはこちらを使用
2. 依存関係が明示的になる
3. 将来のメジャーバージョンで re-export が削除される*可能性*がある

### 検索キーワード

コード内で markuplint のエラークラスを import している箇所を検索し、更新してください:

```
from '@markuplint/parser-utils' → ParserError, TargetParserError, ConfigParserError を確認
from '@markuplint/selector'     → InvalidSelectorError を確認
from '@markuplint/file-resolver'→ ConfigLoadError を確認
from '@markuplint/ml-core'      → UnexpectedCallError を確認
```

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

## `ConfigParserError` メッセージフォーマットのバグ修正

`ConfigParserError` のバグが修正されました。コンストラクタの位置チェックで `info.col` の代わりに `info.line` を二重に比較していました。

### Before（v4 — バグあり）

```typescript
// バグ: info.line を2回チェックし、info.col は未チェック
const pos = info.line != null && info.line != null ? `(${info.line}:${info.col})` : '';
// 結果: line が設定されていれば col が undefined でも常に位置が含まれる
// 例: "error in /config.json(2:undefined)"
```

### After（v5 — 修正済み）

```typescript
const pos = info.line != null && info.col != null ? `(${info.line}:${info.col})` : '';
// 結果: line と col の両方が設定されている場合のみ位置が含まれる
// 例: "error in /config.json(2:5)" または "error in /config.json"
```

### 影響

`ConfigParserError.message` 文字列を解析している場合（正規表現など）、`col` が `undefined` のときに出力が変わります:

| `info` | v4 メッセージ | v5 メッセージ |
|--------|-------------|-------------|
| `{ line: 2, col: 5, filePath: '/a.json' }` | `"msg in /a.json(2:5)"` | `"msg in /a.json(2:5)"`（変更なし） |
| `{ line: 2, filePath: '/a.json' }` | `"msg in /a.json(2:undefined)"` | `"msg in /a.json"` |
| `{ filePath: '/a.json' }` | `"msg in /a.json"` | `"msg in /a.json"`（変更なし） |

### 移行

`(line:col)` が常に存在することを前提とした正規表現パターンを使用している場合、位置が省略されるケースに対応してください。

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

全クラスが `@markuplint/shared` からエクスポートされています。

階層定義とフロー図を含む完全なエラーハンドリングポリシーは[エラーハンドリングポリシー](../architectures/ERROR-HANDLING.ja.md)を参照してください。
