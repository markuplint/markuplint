# フレームワークパーサ 破壊的変更: v4 から v5 への移行ガイド

## 対象読者

- markuplint の設定で `@markuplint/htmx-parser` を使用している **htmx ユーザー**
- markuplint の設定で `@markuplint/alpine-parser` を使用している **Alpine.js ユーザー**
- 新しい `directivePatterns` システムを理解したい**スペックパッケージ作成者**

## 変更一覧

| 変更内容 | 影響範囲 |
|---------|---------|
| `@markuplint/htmx-parser` の削除 | htmx ユーザーは `@markuplint/htmx-spec`（スペックのみ）に移行が必要 |
| `@markuplint/alpine-parser` の簡素化 | Alpine.js ユーザーは属性解決のために `@markuplint/alpine-spec` のインストールが必要 |
| `@markuplint/alpine-parser/spec` の削除 | Alpine.js ユーザーはスペックの指定を `@markuplint/alpine-spec` に変更が必要 |
| スペックパッケージに新しい `directivePatterns` システムを追加 | スペック作成者はパーサを書かずに属性パターンの解決を宣言的に定義可能 |

## htmx: パーサの削除、スペックのみのパッケージに変更

htmx は専用のパーサが不要になりました。新しい `@markuplint/htmx-spec` パッケージは、`directivePatterns` システムを通じて htmx のすべての属性解決（`hx-on:click` から `onclick` への変換など）をパーサレベルではなくスペックレベルで処理します。

### v4（変更前）

パーサパッケージをインストール:

```bash
npm install @markuplint/htmx-parser
```

`parser` と `specs` の両方を設定:

```json
{
  "parser": { "\\.[jt]sx?$": "@markuplint/htmx-parser" },
  "specs": { "\\.[jt]sx?$": "@markuplint/htmx-parser/spec" }
}
```

### v5（変更後）

旧パッケージをアンインストールし、新しいスペックパッケージをインストール:

```bash
npm uninstall @markuplint/htmx-parser
npm install @markuplint/htmx-spec
```

`specs` のみを設定 — パーサは不要:

```json
{
  "specs": { "\\.[jt]sx?$": "@markuplint/htmx-spec" }
}
```

### 変更理由

v4 の htmx サポートでは、ディレクティブ属性の解決（`hx-on:click` から `onclick` など）のためだけにフルのパーサパッケージが必要でした。これはアーキテクチャ上のミスマッチでした — パーサは構文と構造を扱うべきであり、属性のセマンティクスを扱うべきではありません。v5 の新しい `directivePatterns` システムにより、スペックパッケージが属性解決ルールを宣言的に定義できるようになり、パーサが完全に不要になりました。

## Alpine.js: パーサの簡素化、スペックパッケージの分離

Alpine.js のパーサは `<template x-for>` のループ処理（`PSBlock` への変換）のみを担当するように簡素化されました。すべての属性解決（`x-bind:href` から `href`、`@click` から `onclick`、`:class` から `class` など）は、`directivePatterns` システムを通じて新しい `@markuplint/alpine-spec` パッケージに移行されました。

### v4（変更前）

パーサパッケージをインストール（スペックも同梱）:

```bash
npm install @markuplint/alpine-parser
```

`parser` と `specs` の両方をパーサパッケージから参照して設定:

```json
{
  "parser": { "\\.html$": "@markuplint/alpine-parser" },
  "specs": { "\\.html$": "@markuplint/alpine-parser/spec" }
}
```

### v5（変更後）

簡素化されたパーサと新しいスペックパッケージの両方をインストール:

```bash
npm install @markuplint/alpine-parser @markuplint/alpine-spec
```

`parser` と `specs` を別々のパッケージとして設定:

```json
{
  "parser": { "\\.html$": "@markuplint/alpine-parser" },
  "specs": { "\\.html$": "@markuplint/alpine-spec" }
}
```

> **注意:** Alpine.js では引き続きパーサが必要です。`<template x-for>` がループのイテレーション構造を作成するため、AST レベルの処理（PSBlock 変換）が必要であり、スペックパッケージだけでは表現できません。

### 変更理由

v4 では Alpine.js のパーサが2つの責務を混在させていました: 構造的なパース（`<template x-for>` ループ）と属性解決（`x-bind:`、`@`、`:` ショートハンド）。v5 では属性解決が `directivePatterns` を通じてスペックパッケージによって宣言的に処理され、パーサは本当にパーサレベルのサポートが必要な構造変換のみに専念します。

## `directivePatterns` システム（スペック作成者向け）

v5 では `directivePatterns` が導入されました。これは `ExtendedSpec` の新しいフィールドで、フレームワーク固有のディレクティブ属性が標準の HTML 属性にどのようにマッピングされるかをスペックパッケージが宣言できるようにします。これが htmx-parser を不要にし、alpine-parser を簡素化した仕組みです。

### 仕組み

スペックパッケージは `directivePatterns` エントリの配列を定義します。各エントリは、ディレクティブ属性にマッチする正規表現パターンと、標準の属性への変換ルールを指定します:

```ts
const spec: ExtendedSpec = {
  directivePatterns: [
    {
      pattern: '^hx-on[:-]([a-z]+)$',
      potentialName: 'on$1',
      isDirective: true,
      isDynamicValue: true,
    },
  ],
};
```

この例では、パターン `hx-on:click` が `potentialName = "onclick"` に解決され、パーサが htmx を知らなくても markuplint が HTML スペックに対して属性を検証できます。`potentialName` の `$1` プレースホルダーは正規表現パターンの最初のキャプチャグループを参照します。

### `directivePatterns` とパーサの使い分け

| シナリオ | 解決策 |
|---------|-------|
| 標準属性にマッピングされるディレクティブ属性（`x-bind:href` → `href`） | スペックパッケージの `directivePatterns` |
| AST を変更する構造的な変換（`<template x-for>` ループ） | パーサパッケージ |
| 特別なセマンティクスを持つカスタムコンポーネント | Pretenders またはスペックパッケージ |

フレームワークが標準の HTML 属性に解決されるディレクティブ属性のみを追加する場合、`directivePatterns` を持つスペックパッケージだけで十分です。パーサが必要なのは、フレームワークがドキュメントツリーの解析方法を変更する構造的な構文を導入する場合のみです。

## 移行チェックリスト

### htmx ユーザー

1. `@markuplint/htmx-parser` をアンインストール:
   ```bash
   npm uninstall @markuplint/htmx-parser
   ```
2. `@markuplint/htmx-spec` をインストール:
   ```bash
   npm install @markuplint/htmx-spec
   ```
3. markuplint の設定を更新 — `parser` エントリを削除し、`specs` エントリを変更:
   ```diff
    {
   -  "parser": { "\\.[jt]sx?$": "@markuplint/htmx-parser" },
   -  "specs": { "\\.[jt]sx?$": "@markuplint/htmx-parser/spec" }
   +  "specs": { "\\.[jt]sx?$": "@markuplint/htmx-spec" }
    }
   ```

### Alpine.js ユーザー

1. `@markuplint/alpine-spec` をインストール（`@markuplint/alpine-parser` は維持）:
   ```bash
   npm install @markuplint/alpine-spec
   ```
2. markuplint の設定を更新 — `specs` エントリを変更:
   ```diff
    {
      "parser": { "\\.html$": "@markuplint/alpine-parser" },
   -  "specs": { "\\.html$": "@markuplint/alpine-parser/spec" }
   +  "specs": { "\\.html$": "@markuplint/alpine-spec" }
    }
   ```
