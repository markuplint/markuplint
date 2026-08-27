# Node.js

v5 は **Node.js v24.0.0 以降** が必要です。公開パッケージはすべて `"engines": { "node": ">=24" }` です。

v4 の文書は **v18.18.0 以降**（`packages/markuplint/README.md`）。v4 の `package.json` に `engines` はありませんでした。

```bash
node -v
# v24.0.0 以降であること
```

## ポリフィル

内部置換です（Markuplint 経由の推移依存で使っていた場合だけ自分で足してください）。

- `uuid` → `crypto.randomUUID()`
- `@ungap/structured-clone` → `structuredClone()`

## TypeScript ターゲット

共有設定は `"target": "ES2022"` です（`packages/@markuplint-dev/tsconfig/tsconfig.json`）。
