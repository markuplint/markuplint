# Node.js 破壊的変更: v4 から v5 への移行ガイド

## 対象読者

- v4 から v5 にアップグレードする**すべての markuplint ユーザー**

## 変更一覧

| 変更内容 | 影響範囲 |
|---------|---------|
| 最小 Node.js バージョンを v22 に引き上げ | 全ユーザー |
| ポリフィルの削除（`uuid`、`@ungap/structured-clone`） | 内部のみ |
| TypeScript ターゲットを ES2022 に変更 | カスタムルール・プラグイン作成者 |

## Node.js >= 22 が必須

v5 では Node.js v22.0.0 以降が必要です。すべてのパッケージに `engines` フィールドが追加され、この最小バージョンが強制されます。

### v4

Node.js v18.18.0 以降。

### v5

Node.js v22.0.0 以降。

### 移行方法

アップグレード前に Node.js のバージョンを確認してください:

```bash
node -v
# v22.0.0 以降である必要があります
```

バージョンマネージャー（nvm、volta、fnm など）を使用している場合:

```bash
# nvm
nvm install 22
nvm use 22

# volta
volta install node@22
```

CI 設定を Node.js 22+ に更新してください:

```yaml
# 変更前
node-version: [18, 20]

# 変更後
node-version: [22, 24]
```

## 削除されたポリフィル

v5 では Node.js 22+ で利用可能なネイティブ API を使用しています。以下のポリフィルは内部的に削除されました:

- `uuid` — `crypto.randomUUID()` に置換（Node.js 19 以降ネイティブ対応）
- `@ungap/structured-clone` — ネイティブの `structuredClone()` に置換（Node.js 17 以降ネイティブ対応）

これらは内部的な実装の詳細です。markuplint からの推移的な依存関係としてこれらを使用していた場合は、自身の `package.json` に直接追加してください。

## TypeScript ターゲット

TypeScript のコンパイルターゲットが ES2020 から ES2022 に変更されました。これにより以下のネイティブサポートが有効になります:

- `Array.prototype.toSorted()`
- `Array.prototype.toReversed()`
- `Array.prototype.toSpliced()`
- トップレベル `await`
- `Error` の `cause` プロパティ

markuplint の TypeScript 設定でコンパイルするカスタムルールやパーサープラグインを開発している場合は、ランタイムが ES2022 をサポートしていることを確認してください。
