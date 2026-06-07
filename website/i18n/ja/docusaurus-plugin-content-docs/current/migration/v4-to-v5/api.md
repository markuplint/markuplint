---
sidebar_position: 7
title: API
---

# API の変更

このページでは Node.js API の破壊的変更について説明します。Markuplint をプログラムから呼び出している場合や、エディタ連携を構築している場合は確認してください。

## 変更一覧

| 変更内容                       | 影響範囲                              |
| ------------------------------ | ------------------------------------- |
| `exec()` 関数の削除            | `exec()` を直接呼び出しているユーザー |
| 結果に `FixSummary` を追加     | `fix: true` を使用する API ユーザー   |
| `computeCursorOffset()` の追加 | エディタ連携の開発者                  |

## `exec()` 関数の削除

:::caution 破壊的変更
レガシーの `exec()` 関数は削除されました。v1 から非推奨でした。
:::

`exec()` を `MLEngine` に置き換えてください。

**変更前（v4）：**

```js
import { exec } from 'markuplint';

const results = await exec({
  files: 'index.html',
  config: '.markuplintrc',
});
```

**変更後（v5）：**

```js
import { MLEngine } from 'markuplint';

const file = await MLEngine.toMLFile('index.html');
const engine = new MLEngine(file, {
  configFile: '.markuplintrc',
});
const result = await engine.exec();
```

### オプションの対応表

以下の表で `exec()` のオプションを `MLEngine` に変換してください。

| `exec()` オプション（v4）             | `MLEngine` での対応（v5）                            |
| ------------------------------------- | ---------------------------------------------------- |
| `files`                               | `MLEngine.toMLFile()` の第1引数                      |
| `sourceCodes` / `names` / `workspace` | `MLEngine.toMLFile({ sourceCode, name, workspace })` |
| `config`（文字列）                    | `configFile` オプション                              |
| `config`（オブジェクト）              | `config` オプション                                  |
| `defaultConfig`                       | `defaultConfig` オプション                           |
| `rules`                               | `rules` オプション                                   |
| `rulesAutoResolve`                    | `autoLoad` オプション                                |
| `fix`                                 | `fix` オプション                                     |
| `locale`                              | `locale` オプション                                  |

## 新機能: 結果の `FixSummary`

`fix: true` で実行すると、結果に `fixSummary` フィールドが含まれるようになりました。fix プロセスで何が起きたかを確認できます。

```ts
const result = await engine.exec();
if (result?.fixSummary) {
  console.log(`パス数: ${result.fixSummary.passCount}`);
  console.log(`適用数: ${result.fixSummary.totalApplied}`);
  console.log(`スキップ数: ${result.fixSummary.totalSkipped}`);
}
```

| フィールド            | 型                                  | 説明                                                                        |
| --------------------- | ----------------------------------- | --------------------------------------------------------------------------- |
| `passCount`           | `number`                            | 実行された fix パスの回数                                                   |
| `totalApplied`        | `number`                            | 全パスで適用された fix の合計数                                             |
| `totalSkipped`        | `number`                            | 編集の重複によりスキップされた fix の数                                     |
| `reachedMaxPasses`    | `boolean`                           | 10パスの安全上限に達したかどうか                                            |
| `firstPassEdits`      | `readonly TextEdit[]`               | 最初のパスで適用された編集（元のオフセット）                                |
| `finalPassViolations` | `readonly Violation[] \| undefined` | `fixedCode` に残っている違反。fix が1件も適用されていない場合は `undefined` |

トップレベルの `violations` 配列は**初回**パスのみを反映します。fix 後に何が残っているかを確認するには `fixSummary.finalPassViolations ?? violations` を使ってください。

```ts
const remaining = result.fixSummary?.finalPassViolations ?? result.violations;
if (remaining.length === 0) {
  // fix 後のコードはクリーン
}
```

:::info
これは新しい追加機能であり、破壊的変更ではありません。既存のコードへの影響はありません。
:::

## 新機能: `computeCursorOffset()`

エディタ連携のために、`@markuplint/ml-core` から `computeCursorOffset()` がエクスポートされるようになりました。元のソースコード上のカーソル位置を、修正後のソースコード上の位置にリマップします。

```ts
import { computeCursorOffset } from '@markuplint/ml-core';

const newOffset = computeCursorOffset(result.fixSummary.firstPassEdits, originalCursorOffset);
```

最初のパスの編集情報（元のソースコードのオフセットを参照）を使い、修正後のコードでのカーソル位置を計算します。

:::tip
`FixSummary` と `computeCursorOffset()` を組み合わせることで、エディタプラグインでスムーズな修正・ナビゲーション体験を実現できます。
:::
