---
sidebar_position: 1
title: Node.js
---

# Node.js

:::caution 全ユーザー必須
Markuplint v5 は **Node.js v24.0.0 以降**が必要です。アップグレード前にバージョンを確認してください。
:::

## 最小バージョン: v24.0.0

最小 Node.js バージョンが v18.18.0 から **v24.0.0** に引き上げられました。すべてのパッケージの `engines` フィールドで強制されます。

現在のバージョンを確認してください:

```bash
node -v
# v24.0.0 以降である必要があります
```

### バージョンマネージャーを使用している場合

```bash
# nvm
nvm install 24
nvm use 24

# volta
volta install node@24
```

### CI 設定の更新

```yaml
# 変更前（v4）
node-version: [18, 20]

# 変更後（v5）
node-version: [24, 26]
```

## ポリフィルの削除

v5 ではポリフィルの代わりにネイティブ API を使用します。以下のパッケージが内部的に削除されました:

- `uuid` -- ネイティブの `crypto.randomUUID()` に置換
- `@ungap/structured-clone` -- ネイティブの `structuredClone()` に置換

:::note
これらは内部的な変更です。Markuplint の推移的な依存関係としてこれらを使用していた場合は、`package.json` に直接追加してください。
:::

## TypeScript ターゲットが ES2022 に変更

コンパイルターゲットが ES2020 から ES2022 に変更されました。Markuplint の TypeScript 設定でコンパイルするカスタムルールやパーサープラグインの作成者に影響します。

ランタイムがトップレベル `await` や `Error.cause` などの ES2022 機能をサポートしていることを確認してください。
