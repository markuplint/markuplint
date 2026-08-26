---
sidebar_position: 6
title: ルール修正関数
---

# ルール修正関数

:::tip 新機能
v5 の**新機能**です。v4 に対応する機能はありません。既存のルールは変更なしで動作します。このページでは、カスタムルールに自動修正を追加する方法を説明します。
:::

## 対象読者

- 自動修正機能を追加したいカスタムルール作成者
- サードパーティの Markuplint ルールを開発するプラグイン開発者

## 概要

v5 では ESLint のフィクサーに着想を得た自動修正システムが導入されました。`context.report()` に `fix` コールバックを追加します。ユーザーが `fix=true` で Markuplint を実行すると、コールバックが編集を生成してソースに適用します。

## fix コールバックの追加

`report()` に `fix` プロパティを追加します。`IRuleFixer` を受け取り、1つ以上の `TextEdit` オブジェクトを返します:

```typescript
context.report({
  scope: node,
  message: 'タグ名は小文字にすべきです',
  fix: fixer => fixer.replaceText({ startOffset: nameOffset, raw: node.rawName }, node.rawName.toLowerCase()),
});
```

:::note
`fix` コールバックはリント中には実行されません。`MLCore.verify()` に `fix=true` が渡された場合のみ実行されます。
:::

## IRuleFixer API

`IRuleFixer` インターフェースは 6 つのメソッドを提供します:

| メソッド                    | 動作                         |
| --------------------------- | ---------------------------- |
| `replaceText(token, text)`  | トークンのテキストを置換     |
| `replaceRange(range, text)` | `[start, end)` レンジを置換  |
| `insertBefore(token, text)` | トークンの前にテキストを挿入 |
| `insertAfter(token, text)`  | トークンの後にテキストを挿入 |
| `remove(token)`             | トークンを削除               |
| `removeRange(range)`        | `[start, end)` レンジを削除  |

### `FixToken` 型

`token` を受け取るメソッドは `FixToken` 型を使用します:

```typescript
type FixToken = {
  readonly startOffset: number;
  readonly raw: string;
};
```

すべての MLDOM トークン（`MLToken`、`MLAttr`、`nameNode`、`valueNode` など）はこの型を満たします。手動でトークンを作成することもできます:

```typescript
fix: fixer => fixer.replaceText(
  { startOffset: 42, raw: 'old-text' },
  'new-text',
),
```

### 複数の編集を返す

`TextEdit` の配列を返すと、アトミックな複数編集になります。グループ内のいずれかの編集が他のルールの fix と重複すると、グループ全体がスキップされます:

```typescript
fix: fixer => [
  fixer.remove(attr.spacesBeforeEqual),
  fixer.remove(attr.equal),
  fixer.remove(attr.valueNode),
],
```

## 実装例

### テキストの置換

タグ名を小文字に変換:

```typescript
fix: fixer => fixer.replaceText(
  { startOffset: nameOffset, raw: el.rawName },
  el.rawName.toLowerCase(),
),
```

### トークンの削除

孤立した終了タグを削除:

```typescript
fix: fixer => fixer.remove(
  { startOffset: text.startOffset, raw: text.raw },
),
```

### レンジによる削除

属性全体を削除（先頭の空白から閉じ引用符まで）:

```typescript
fix: fixer => fixer.removeRange([
  firstToken.startOffset,
  lastToken.startOffset + lastToken.raw.length,
]),
```

## ヘルパー関数

`@markuplint/rules` に属性削除パターン用の共有ヘルパーが用意されています:

| ヘルパー                       | 動作                                             |
| ------------------------------ | ------------------------------------------------ |
| `removeAttr(fixer, attr)`      | 属性全体を削除（属性名 + 値 + 空白）             |
| `removeAttrValue(fixer, attr)` | 値部分のみ削除（等号、引用符、値）、属性名は残す |

null/空トークンは自動的に処理されます。

## マルチパス fix の動作

複数のルールが重複する fix を生成した場合、エンジンが解決します:

1. すべての fix を収集し、1パスで適用
2. 重複する fix はスキップ
3. スキップがあった場合、ソースを再パースしてルールを再実行
4. スキップがなくなるまで繰り返す（最大10パス）

:::tip
ルール作成者が重複する fix を処理する必要はありません。エンジンが自動的に管理します。
:::

## 自動修正をサポートする組み込みルール

v5 で自動修正をサポートする組み込みルール:

| ルール                     | 修正内容                         |
| -------------------------- | -------------------------------- |
| `case-sensitive-tag-name`  | 設定されたケースにタグ名を変換   |
| `case-sensitive-attr-name` | 設定されたケースに属性名を変換   |
| `attr-value-quotes`        | 設定されたスタイルに引用符を変換 |
| `no-boolean-attr-value`    | 真偽値属性から値を削除           |
| `no-default-value`         | デフォルト値を持つ属性を削除     |
| `no-duplicate-attr`        | 重複属性を削除                   |
| `no-ineffective-attr`      | 無効な属性を削除                 |
| `no-orphaned-end-tag`      | 孤立した終了タグを削除           |
| `no-consecutive-br`        | 連続する `<br>` 要素を削除       |
| `attr-order`               | 設定された順序に属性を並べ替え   |
| `head-element-order`       | head 内の子要素を並べ替え        |

## 型のインポート

```typescript
import type { IRuleFixer, TextEdit, FixToken } from '@markuplint/ml-config';
```

`IRuleFixer` はコールバックに渡されます。自分でインスタンス化する必要はありません。
