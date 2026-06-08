# API 破壊的変更: v4 から v5 への移行ガイド

## 対象読者

- markuplint をプログラムから呼び出している **Node.js API ユーザー**
- markuplint の JavaScript API を統合している **カスタムツール作成者**

## 変更一覧

| 変更内容                                                                  | 影響範囲                                           |
| ------------------------------------------------------------------------- | -------------------------------------------------- |
| `exec` 関数の削除（v1 API）                                               | `exec()` を呼び出しているユーザー                  |
| `autoLoad` オプションの削除                                               | API オプションで `autoLoad` を設定しているユーザー |
| `MLResultInfo_v1` インターフェースの削除                                  | v1 のリザルト型を参照しているユーザー              |
| `getIndent()` を `@markuplint/ml-core` から削除                           | `getIndent()` を使用しているカスタムルール作成者   |
| `Token.getLine()` / `Token.getCol()` を `@markuplint/types` から削除      | これらの静的メソッドを呼び出しているユーザー       |
| `getLine()` / `getCol()` を `@markuplint/parser-utils` から削除           | パーサープラグイン開発者                           |
| 新機能: `MLResultInfo` に `FixSummary`                                    | Fix 診断情報にアクセスする API ユーザー            |
| 新機能: `@markuplint/ml-core` から `computeCursorOffset()` をエクスポート | エディタ連携開発者                                 |

## `exec` 関数の削除

レガシーの `exec` 関数（v1 API）は削除されました。代わりに `lint` または `MLEngine` を使用してください。

### v4

```js
import { exec } from 'markuplint';

const results = await exec({
  files: 'index.html',
  config: '.markuplintrc',
});
```

### v5

`MLEngine` を使用:

```js
import { MLEngine } from 'markuplint';

const file = await MLEngine.toMLFile('index.html');
const engine = new MLEngine(file, {
  configFile: '.markuplintrc',
});
const result = await engine.exec();
```

### 移行方法

| v1（`exec`）のオプション              | v5 での対応                                          |
| ------------------------------------- | ---------------------------------------------------- |
| `files`                               | `MLEngine.toMLFile()` の第一引数                     |
| `sourceCodes` / `names` / `workspace` | `MLEngine.toMLFile({ sourceCode, name, workspace })` |
| `config`（文字列）                    | `configFile` オプション                              |
| `config`（オブジェクト）              | `config` オプション                                  |
| `defaultConfig`                       | `defaultConfig` オプション                           |
| `rules`                               | `rules` オプション                                   |
| `rulesAutoResolve`                    | 削除 — ルールは常に自動ロードされます                |
| `fix`                                 | `fix` オプション                                     |
| `locale`                              | `locale` オプション                                  |

## `autoLoad` オプションの削除

`autoLoad` オプションは `APIOptions` から削除されました。ルールセットで参照されているルールは常に自動ロードされます。明示的に `autoLoad: true` を設定していた場合は、単に削除してください — この動作がデフォルトになりました。

```ts
// v4
const engine = new MLEngine(file, {
  autoLoad: true, // 不要になりました
});

// v5
const engine = new MLEngine(file, {});
```

## `MLResultInfo_v1` の削除

レガシーの `MLResultInfo_v1` インターフェースは削除されました。代わりに `MLResultInfo` を使用してください。

## `getIndent()` の `@markuplint/ml-core` からの削除

deprecated の `getIndent()` 関数は `@markuplint/ml-core` の公開 API から削除されました。

## `Token.getLine()` / `Token.getCol()` の削除

deprecated の静的メソッド `Token.getLine()` と `Token.getCol()` は `@markuplint/types` から削除されました。代わりに `Token.getPosition()` を使用してください:

```ts
// v4
const line = Token.getLine(value, offset);
const col = Token.getCol(value, offset);

// v5
const { line, column } = Token.getPosition(value, offset);
```

## `getLine()` / `getCol()` の `@markuplint/parser-utils` からの削除

deprecated の `getLine()` と `getCol()` 関数は削除されました。代わりに `getPosition()` を使用してください:

```ts
// v4
import { getLine, getCol } from '@markuplint/parser-utils';

const line = getLine(rawCode, offset);
const col = getCol(rawCode, offset);

// v5
import { getPosition } from '@markuplint/parser-utils';

const { line, column } = getPosition(rawCode, offset);
```

## 新機能: `MLResultInfo` の `FixSummary`

`fix: true` を設定した場合、`MLResultInfo` に fix プロセスの診断情報を含む `fixSummary` フィールドが追加されました:

```typescript
const result = await engine.exec();
if (result?.fixSummary) {
  console.log(`パス数: ${result.fixSummary.passCount}`);
  console.log(`適用数: ${result.fixSummary.totalApplied}`);
  console.log(`スキップ数: ${result.fixSummary.totalSkipped}`);
}
```

`FixSummary` のフィールド:

| フィールド            | 型                                  | 説明                                                                                                                                                      |
| --------------------- | ----------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `passCount`           | `number`                            | 実行された fix パスの回数                                                                                                                                 |
| `totalApplied`        | `number`                            | 全パスで適用された fix の合計数                                                                                                                           |
| `totalSkipped`        | `number`                            | 重複によりスキップされた fix の合計数                                                                                                                     |
| `reachedMaxPasses`    | `boolean`                           | 10パスの安全上限に達したかどうか                                                                                                                          |
| `firstPassEdits`      | `readonly TextEdit[]`               | 最初のパスで適用された編集（元のオフセット）                                                                                                              |
| `finalPassViolations` | `readonly Violation[] \| undefined` | `fixedCode` に残っている違反（最終パス後に再検証済み）。fix が1件も適用されていない場合は `undefined`（その場合は初回パスの `violations` がそのまま正確） |

トップレベルの `violations` 配列は**初回**パスのみを反映します。fix 後に何が残っているかを確認するには `fixSummary.finalPassViolations ?? violations` を使ってください:

```typescript
const remaining = result.fixSummary?.finalPassViolations ?? result.violations;
if (remaining.length === 0) {
  // fix 後のコードはクリーン
}
```

## 新機能: `computeCursorOffset()`

エディタ連携のために、`@markuplint/ml-core` から `computeCursorOffset()` がエクスポートされました。元のソースコード上のカーソル位置を修正後のソースコード上の位置にリマップします:

```typescript
import { computeCursorOffset } from '@markuplint/ml-core';

// 修正後、カーソルをリマップ
const newOffset = computeCursorOffset(result.fixSummary.firstPassEdits, originalCursorOffset);
```

最初のパスの編集情報（元のソースコードのオフセットを参照）を使用して、修正後のコードでカーソルを配置すべき位置を計算します。
