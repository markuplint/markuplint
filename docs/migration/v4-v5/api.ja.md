# API 破壊的変更: v4 から v5 への移行ガイド

## 対象読者

- markuplint をプログラムから呼び出している **Node.js API ユーザー**
- markuplint の JavaScript API を統合している **カスタムツール作成者**

## 変更一覧

| 変更内容 | 影響範囲 |
|---------|---------|
| `exec` 関数の削除（v1 API） | `exec()` を呼び出しているユーザー |
| 新機能: `MLResultInfo` に `FixSummary` | Fix 診断情報にアクセスする API ユーザー |
| 新機能: `@markuplint/ml-core` から `computeCursorOffset()` をエクスポート | エディタ連携開発者 |

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

| v1（`exec`）のオプション | v5 での対応 |
|------------------------|------------|
| `files` | `MLEngine.toMLFile()` の第一引数 |
| `sourceCodes` / `names` / `workspace` | `MLEngine.toMLFile({ sourceCode, name, workspace })` |
| `config`（文字列） | `configFile` オプション |
| `config`（オブジェクト） | `config` オプション |
| `defaultConfig` | `defaultConfig` オプション |
| `rules` | `rules` オプション |
| `rulesAutoResolve` | `autoLoad` オプション |
| `fix` | `fix` オプション |
| `locale` | `locale` オプション |

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

| フィールド | 型 | 説明 |
|-----------|-----|------|
| `passCount` | `number` | 実行された fix パスの回数 |
| `totalApplied` | `number` | 全パスで適用された fix の合計数 |
| `totalSkipped` | `number` | 重複によりスキップされた fix の合計数 |
| `reachedMaxPasses` | `boolean` | 10パスの安全上限に達したかどうか |
| `firstPassEdits` | `readonly TextEdit[]` | 最初のパスで適用された編集（元のオフセット） |

## 新機能: `computeCursorOffset()`

エディタ連携のために、`@markuplint/ml-core` から `computeCursorOffset()` がエクスポートされました。元のソースコード上のカーソル位置を修正後のソースコード上の位置にリマップします:

```typescript
import { computeCursorOffset } from '@markuplint/ml-core';

// 修正後、カーソルをリマップ
const newOffset = computeCursorOffset(
  result.fixSummary.firstPassEdits,
  originalCursorOffset,
);
```

最初のパスの編集情報（元のソースコードのオフセットを参照）を使用して、修正後のコードでカーソルを配置すべき位置を計算します。
