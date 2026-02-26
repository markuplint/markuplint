---
sidebar_position: 5
title: フレームワークパーサー
---

# フレームワークパーサーの変更

v5 では htmx と Alpine.js のサポート方法が変更されました。それ以外のフレームワークパーサー（Vue、React、Svelte など）は**変更ありません**。

## 変更点

| 変更内容                                | 影響を受けるユーザー     |
| --------------------------------------- | ------------------------ |
| `@markuplint/htmx-parser` の削除        | htmx ユーザー            |
| `@markuplint/alpine-parser/spec` の削除 | Alpine.js ユーザー       |
| 新パッケージ `@markuplint/alpine-spec`  | Alpine.js ユーザー       |
| 新しい `directivePatterns` システム     | スペックパッケージ作成者 |
| `useIDLAttributeNames` のリネーム       | スペックパッケージ作成者 |

## htmx: パーサーからスペックパッケージへ

htmx はパーサーが不要になりました。新しい `@markuplint/htmx-spec` パッケージが属性の解決（`hx-on:click` から `onclick` など）をスペックレベルで処理します。

### 変更前（v4）

```bash
npm install @markuplint/htmx-parser
```

```json
{
  "parser": { "\\.[jt]sx?$": "@markuplint/htmx-parser" },
  "specs": { "\\.[jt]sx?$": "@markuplint/htmx-parser/spec" }
}
```

### 変更後（v5）

```bash
npm uninstall @markuplint/htmx-parser
npm install @markuplint/htmx-spec
```

```json
{
  "specs": { "\\.[jt]sx?$": "@markuplint/htmx-spec" }
}
```

設定ファイルの差分:

```diff
 {
-  "parser": { "\\.[jt]sx?$": "@markuplint/htmx-parser" },
-  "specs": { "\\.[jt]sx?$": "@markuplint/htmx-parser/spec" }
+  "specs": { "\\.[jt]sx?$": "@markuplint/htmx-spec" }
 }
```

## Alpine.js: 新しいスペックパッケージの追加

Alpine.js のパーサーは `<template x-for>` ループ処理のみを担当するようになりました。属性の解決（`x-bind:href`、`@click`、`:class` など）は新しい `@markuplint/alpine-spec` パッケージに移行されました。

### 変更前（v4）

```bash
npm install @markuplint/alpine-parser
```

```json
{
  "parser": { "\\.html$": "@markuplint/alpine-parser" },
  "specs": { "\\.html$": "@markuplint/alpine-parser/spec" }
}
```

### 変更後（v5）

```bash
npm install @markuplint/alpine-parser @markuplint/alpine-spec
```

```json
{
  "parser": { "\\.html$": "@markuplint/alpine-parser" },
  "specs": { "\\.html$": "@markuplint/alpine-spec" }
}
```

設定ファイルの差分:

```diff
 {
   "parser": { "\\.html$": "@markuplint/alpine-parser" },
-  "specs": { "\\.html$": "@markuplint/alpine-parser/spec" }
+  "specs": { "\\.html$": "@markuplint/alpine-spec" }
 }
```

:::note
Alpine.js では引き続きパーサーが必要です。`<template x-for>` ディレクティブが AST レベルの処理を必要とするループ構造を作成するためです。
:::

## `directivePatterns` システム

:::info
このセクションはスペックパッケージの作成者向けです。一般ユーザーは読み飛ばして構いません。
:::

v5 では `directivePatterns` が導入されました。`ExtendedSpec` の新しいフィールドで、フレームワーク固有のディレクティブ属性が標準 HTML 属性にどうマッピングされるかを宣言できます。パーサーを書く必要はありません。

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

この例では `hx-on:click` が `onclick` に解決されます。`$1` は正規表現の最初のキャプチャグループを参照します。

### `directivePatterns` とパーサーの使い分け

| シナリオ                                         | 解決策                                   |
| ------------------------------------------------ | ---------------------------------------- |
| 標準属性にマッピングされるディレクティブ属性     | スペックパッケージの `directivePatterns` |
| AST を変更する構造的な変換                       | パーサーパッケージ                       |
| 特別なセマンティクスを持つカスタムコンポーネント | Pretenders またはスペックパッケージ      |

## `useIDLAttributeNames` から `acceptedAttrNames` へリネーム

:::info
このセクションはスペックパッケージの作成者向けです。一般ユーザーは読み飛ばして構いません。
:::

`ExtendedSpec` のプロパティ `useIDLAttributeNames` が、目的をより正確に表す `acceptedAttrNames` にリネームされました。

```diff
 const spec: ExtendedSpec = {
-  useIDLAttributeNames: true,
+  acceptedAttrNames: 'idl',
 };
```

`@markuplint/react-spec` と `@markuplint/svelte-spec` はこの API を使用するように更新済みです。カスタムスペックパッケージで `useIDLAttributeNames` を設定している場合は、`acceptedAttrNames` に更新してください。

## その他のフレームワークパーサー

Vue、React、Svelte、JSX、Pug、EJS、ERB、Liquid、Mustache、Nunjucks、PHP、Smarty のパーサーは v5 で**破壊的変更はありません**。移行作業は不要です。
