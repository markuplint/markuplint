# エラーハンドリングポリシー

markuplint のエラー分類と処理方針を定めるドキュメントです。
ランタイムで発生しうる全エラーは、3つの階層のいずれかに分類されます。
各階層は**誰の責任か**、**何が起きるか**、**ユーザーにどう見えるか**を規定します。

## 3階層分類

```
Tier 1: Fatal ──────── プロセス全体を即座に終了（exit 2）
Tier 2: Per-File ───── そのファイルだけスキップ、他のファイルは続行
Tier 3: Violation ──── Violation に変換してリント結果に合流
```

### Tier 1 — Fatal（プロセス終了）

**基準:** markuplint 自身の不変条件が崩れている。続行しても信頼できる結果を返せない。

| エラー | 発生層 | 理由 |
|--------|--------|------|
| `TypeError` | 全層 | 実装バグ — null/undefined アクセス、型の不一致 |
| `ReferenceError` | 全層 | 実装バグ — 未定義変数 |
| `UnexpectedCallError` | MLDOM | 内部 API 契約違反 |
| `RangeError` / `SyntaxError`（markuplint コード起因） | 全層 | 実装バグ |
| 非 `Error` オブジェクトの throw（例: `throw "string"`） | 全層 | 不明な障害。安全な続行を保証できない |
| `resolveFiles()` の失敗 | CLI | 入力の前提が崩壊 — リントするファイルがない |

**動作:**

1. stderr にフルスタックトレースを出力
2. 終了コード `2` で exit（リントエラーの `1` と区別）
3. catch、変換、サイレント化は一切禁止

**実装ルール:** `Error` を扱う全ての `catch` ブロックで、汎用的なエラー処理の前に
Tier 1 エラーをガードすること。`@markuplint/shared` の `isFatalError()` を使用する:

```typescript
import { isFatalError } from '@markuplint/shared';

// パターン — Fatal エラーの握りつぶしを防ぐガード
catch (error) {
    if (isFatalError(error)) {
        throw error;
    }
    // ... リカバリ可能なエラーの処理
}
```

### Tier 2 — Per-File Recoverable（ファイル単位でスキップ、他は続行）

**基準:** 特定ファイルの処理が失敗したが、他のファイルには影響しない。障害は環境や設定スコープに閉じており、markuplint のバグではない。

| エラー | 発生層 | 理由 |
|--------|--------|------|
| `ConfigLoadError` | file-resolver | 対象ファイル向け設定が読めない |
| `CircularReferenceError` | config-provider | 設定チェーンの `extends` 循環参照 |
| パーサーモジュール import 失敗 | file-resolver / general-import | 例: `@markuplint/vue-parser` 未インストール |
| ファイル I/O エラー (`ENOENT`, `EACCES`) | fs | 権限不足、実行中のファイル削除 |
| ルール内の予期しないエラー（Tier 1 に該当しないもの） | ml-core → rule.verify() | ParserError でもプログラマーエラーでもない例外 |

**動作:**

1. `lint-error` イベントを発行（ファイルパスとエラーを含む）
2. そのファイルに対し `severity: 'error'`、`ruleId: 'system-error'` の Violation を1件返す
3. debug ロガーにエラー詳細を記録
4. 次のファイルの処理を継続

**実装ルール:** `MLEngine.exec()` が境界。Tier 2 エラーをキャッチして単一 violation 付きの
結果に変換し、正常に return する。Fatal エラー（Tier 1）はキャッチしてはならない。

```typescript
// MLEngine.exec()
catch (error) {
    // Fatal エラーはそのまま伝搬
    if (isFatalError(error)) {
        throw error;
    }
    if (error instanceof Error) {
        this.emit('lint-error', filePath, sourceCode, error);
        return { violations: [{ severity: 'error', ruleId: 'system-error', ... }], ... };
    }
    // 非 Error の throw → Fatal として扱う（isFatalError で既に処理済み）
    throw error;
}
```

### Tier 3 — Violation（ユーザー起因、結果に合流）

**基準:** ユーザーのソースコードまたは設定に起因する。ユーザーが修正可能。markuplint は正常に動作している。

| エラー | severity | `ruleId` |
|--------|----------|----------|
| `ParserError`（HTML 構文エラー） | `severity.parseError` 設定に依存 | `parse-error` |
| `TargetParserError`（要素レベル構文エラー） | 同上 | `parse-error` |
| `ConfigParserError`（`.markuplintrc` 構文エラー） | `warning` | `config-error` |
| `InvalidSelectorError` → `ConfigParserError` | `warning` | `config-error` |
| 設定内の未定義ルール名 | `warning` | `config-error` |
| ルール実行中の `ParserError` | `severity.parseError` 設定に依存 | `parse-error` |
| accname 計算の運用エラー | *（violation にはならない — 空文字を返す）* | — |

**動作:**

1. エラーを適切な severity と ruleId を持つ `Violation` オブジェクトに変換
2. ファイルの violation 配列にルール違反と並べて格納
3. ユーザーには他のリント結果と同じ出力形式で表示

**実装ルール:** `MLCore.verify()` が境界。パースエラーと設定エラーを violation に変換する。
呼び出し元（`MLEngine`）は violation を含む通常の `VerifyResult` を受け取る。

## エラーフロー図

```
ソースコード / 設定 / モジュール
        │
        ▼
┌─────────────────────────────────────┐
│  Parser / Config / Import 層        │
│                                     │
│  ParserError ──────────────┐        │
│  ConfigLoadError ──────────┤        │
│  ConfigParserError ────────┤        │
│  TypeError ────────────────┤        │
│  Other Error ──────────────┘        │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│  MLCore (#parse, #createDocument,   │
│          #runAllRules, verify)       │
│                                     │
│  ParserError  → Violation (Tier 3)  │
│  ConfigError  → Violation (Tier 3)  │
│  TypeError    → 再スロー  (Tier 1)  │
│  Other Error  → 再スロー  (Tier 2)  │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│  MLEngine (exec)                    │
│                                     │
│  VerifyResult → そのまま return     │
│  TypeError    → 再スロー  (Tier 1)  │
│  Other Error  → lint-error イベント │
│                 + system-error      │
│                   violation (Tier 2)│
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│  CLI (command, index.ts)            │
│                                     │
│  Result      → 出力 + exit 0/1     │
│  Tier 1      → stderr + exit 2     │
└─────────────────────────────────────┘
```

## 終了コード

| コード | 意味 |
|--------|------|
| `0` | リント完了、エラーなし（`--allow-warnings` 時は警告があっても 0） |
| `1` | リント完了、severity `error` の違反が検出された |
| `2` | Fatal エラー — markuplint 自体が異常終了した |

## 特殊ケース

### accname 計算エラー

アクセシブル名の計算（`accname.ts`）は、壊れた DOM 状態や不完全なスペックデータにより失敗することがある。これらを violation に変換**しない**理由:

- 単一要素の accname 失敗が無関係なルールにノイズを生むべきではない
- accname の結果（空文字 = "unnamed"）は、下流の a11y ルールが意味のある violation を生成する

`TypeError` を含む**全ての**エラーを catch し、`debug` ロガーに記録して空の名前を返す。
これは Tier 1 再スローポリシーの意図的な例外である。accname の失敗は実装バグだけでなく、
ランタイム環境差異（例: Deno で一部 DOM API が存在しない）によっても起こりうるため。

### generalImport() の失敗

`generalImport()` のモジュール import 失敗は throw せず `null` を返す。
これは Tier 1 再スローポリシーの意図的な例外である: `await import()` /
`require()` は第三者モジュールのコードを実行するため、この境界での
TypeError / SyntaxError は import されたモジュール側に由来する可能性があり、
markuplint 自身のコードと区別できない。上の Tier 1 表で SyntaxError に
「from markuplint code」の qualifier が付いているのは、まさにこのケースを
許容するためである。`generalImport()` はすべてのエラーを呑んで `null` を
返し、missing module の意味付け（パーサー未インストール / 仕様不足 / etc.）は
呼び出し元（config / parser / plugin loader）が決める。

missing module の分類は呼び出し元が決定する:

- **Tier 2**（パーサー未インストール → そのファイルタイプをスキップ）
- **Tier 3**（spec 不足 → ベース spec で続行し、config-error で warn）

### コンソール出力の一貫性

CLI 層のエラー出力はすべて `process.stderr.write()` を使用すること。
エラー報告に `console.warn()`、`console.error()`、`console.log()` を使ってはならない。

## エラークラス管理

全カスタムエラークラスと階層判定ユーティリティは **`@markuplint/shared`** で管理する。
他のパッケージは独自にエラークラスを定義せず、`@markuplint/shared` からインポートする。

### パッケージレイアウト

```
@markuplint/shared/src/
├── errors/
│   ├── index.ts                  -- 全エラークラスとガード関数の re-export
│   ├── parser-error.ts           -- ParserError, TargetParserError, ConfigParserError
│   ├── config-error.ts           -- ConfigLoadError
│   ├── selector-error.ts         -- InvalidSelectorError
│   ├── unexpected-call-error.ts  -- UnexpectedCallError
│   └── guards.ts                 -- isFatalError()
├── functions.ts                  -- （既存）
├── types.ts                      -- （既存）
└── index.ts                      -- errors/, functions, types を re-export
```

### エラークラス階層

```
Error (組み込み)
├── ParserError                    -- Tier 3: ユーザーのソースコード構文エラー
│   ├── TargetParserError          -- Tier 3: 要素レベルのパースエラー
│   └── ConfigParserError          -- Tier 3: 設定ファイルの構文エラー
├── ConfigLoadError                -- Tier 2: 設定ファイルを読み込めない
├── InvalidSelectorError           -- Tier 3: 設定内の CSS セレクタ構文エラー
└── UnexpectedCallError            -- Tier 1: 内部 API 契約違反
```

### ガード関数

```typescript
// @markuplint/shared/src/errors/guards.ts

/**
 * Tier 1（Fatal）エラーかどうかを判定する。
 * true の場合、catch してはならず、変換やサイレント化も禁止。
 * 実装バグまたは不変条件の破壊を示す。
 */
export function isFatalError(error: unknown): boolean {
    return (
        error instanceof TypeError ||
        error instanceof ReferenceError ||
        error instanceof RangeError ||
        error instanceof SyntaxError ||
        error instanceof UnexpectedCallError ||
        !(error instanceof Error)
    );
}
```

### 定義の場所と import 元の使い分け

エラークラスは `@markuplint/shared` で**定義**される。一部はドメインパッケージから
**re-export** される。ドメインパッケージがある場合はそちらから import し、
横断ユーティリティは `@markuplint/shared` から直接 import する。

| クラス | 定義場所 | 公開 API（import 元） |
|--------|---------|----------------------|
| `ParserError`, `TargetParserError`, `ConfigParserError` | `@markuplint/shared` | `@markuplint/parser-utils` |
| `InvalidSelectorError` | `@markuplint/shared` | `@markuplint/selector` |
| `ConfigLoadError` | `@markuplint/shared` | `@markuplint/shared`（ドメインパッケージなし） |
| `UnexpectedCallError` | `@markuplint/shared` | `@markuplint/shared`（内部利用） |
| `isFatalError()` | `@markuplint/shared` | `@markuplint/shared` |

パッケージ内部でのみ使われ、階層分類に関与**しない**エラークラスは元のパッケージに残す:

| クラス | パッケージ | 理由 |
|--------|-----------|------|
| `CircularReferenceError` | `@markuplint/file-resolver`（非 export） | 内部実装の詳細 |
| `UnsupportedError` | `@markuplint/rules`（内部） | ドメイン固有、パッケージ間利用なし |
| `CreateRuleHelperError` | `@markuplint/create-rule`（内部） | CLI ツール、パッケージ間利用なし |
| `HelpRequested`, `UsageHintError` | `@markuplint/create-rule`（非 export） | CLI フロー制御、本質的なエラーではない |

### なぜ `@markuplint/shared` か？

- **既に広く依存されている** — 多くのパッケージが既に `@markuplint/shared` に依存しており、新しい依存エッジが増えない。
- **新パッケージのオーバーヘッドなし** — 専用の `@markuplint/errors` パッケージの作成・公開・メンテナンスコストを回避。
- **横断ユーティリティの自然な置き場所** — `isFatalError()` のようなガード関数は、他の共有ユーティリティと並ぶべき。

## 新規コード向けチェックリスト

markuplint のどこかで `catch` ブロックを書くとき:

1. **Tier 1 を最初にガード。** `@markuplint/shared` の `isFatalError()` を使い、何よりも先に Fatal エラーを再スローする。
2. **階層を特定。** このエラーはユーザー起因（Tier 3）か、環境/ファイル起因（Tier 2）か、markuplint 自体のバグ（Tier 1）か？
3. **正しい境界で変換。** Tier 3 → `MLCore` で `Violation` に。Tier 2 → `MLEngine` で `system-error` violation に。Tier 1 → 一切 catch しない。
4. **デバッグ用にログ。** `debug` ロガーを使い、`DEBUG=*` 設定時にエラーを追跡可能にする。
5. **サイレント握りつぶし禁止。** 全ての `catch` は再スロー、可視的な結果への変換、ログ記録のいずれかを行う。空の `catch {}` ブロックは禁止。
