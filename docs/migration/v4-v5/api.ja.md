# API 破壊的変更: v4 から v5 への移行ガイド

## 対象読者

- markuplint をプログラムから呼び出している **Node.js API ユーザー**
- markuplint の JavaScript API を統合している **カスタムツール作成者**

## 変更一覧

| 変更内容 | 影響範囲 |
|---------|---------|
| `exec` 関数の削除（v1 API） | `exec()` を呼び出しているユーザー |

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
