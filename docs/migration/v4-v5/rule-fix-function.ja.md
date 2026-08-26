# ルール Fix 関数: v4 から v5 マイグレーションガイド

## 対象読者

- カスタムルールに自動修正機能を追加したい**カスタムルール作者**
- サードパーティの markuplint ルールを開発する**プラグイン開発者**

> これは v5 の**新機能**であり、v4 に対応する機能はありません。既存のルールは変更なしで動作し続けます。このガイドは新しい fix API の使い方を説明します。

## 概要

v5 では ESLint の `SourceCodeFixer` に着想を得た自動修正システムが導入されました。ルールは `report()` 呼び出しに `fix` コールバックを付与できるようになりました。ユーザーが `fix=true` で markuplint を実行すると、これらのコールバックが `TextEdit` オブジェクトを生成し、ソースコードに適用されます。

## Fix コールバックの追加

### 基本的な使い方

`report()` 呼び出しに `fix` プロパティを追加します。コールバックは `IRuleFixer` インスタンスを受け取り、1つ以上の `TextEdit` オブジェクトを返します:

```typescript
context.report({
  scope: node,
  message: 'タグ名は小文字にすべきです',
  fix: fixer => fixer.replaceText(
    { startOffset: nameOffset, raw: node.rawName },
    node.rawName.toLowerCase(),
  ),
});
```

`fix` コールバックは検証中には**実行されません** — 保存されるだけで、`MLCore.verify()` に `fix=true` が渡された場合にのみ呼び出されます。

## IRuleFixer API

`IRuleFixer` インターフェース（`@markuplint/ml-config` から提供）は 6 つのメソッドを持ちます:

| メソッド | 説明 |
|----------|------|
| `replaceText(token, text)` | トークンのテキストを新しい内容に置換 |
| `replaceRange(range, text)` | 明示的な `[start, end)` レンジを置換 |
| `insertBefore(token, text)` | トークンの前にテキストを挿入 |
| `insertAfter(token, text)` | トークンの後にテキストを挿入 |
| `remove(token)` | トークンを完全に削除 |
| `removeRange(range)` | 明示的な `[start, end)` レンジを削除 |

### token パラメータ

`token` パラメータを受け付けるメソッドは `FixToken` 型を満たすオブジェクトが必要です:

```typescript
type FixToken = {
  readonly startOffset: number;
  readonly raw: string;
};
```

すべての MLDOM トークン（`MLToken`、`MLAttr`、`nameNode`、`valueNode` などの属性サブトークン）はこのインターフェースを満たします。アドホックなトークンを構築することも可能です:

```typescript
fix: fixer => fixer.replaceText(
  { startOffset: 42, raw: 'old-text' },
  'new-text',
),
```

### 複数の編集を返す

fix コールバックは単一の `TextEdit` または `TextEdit` の配列を返すことができます。単一コールバック内の複数の編集はアトミックに適用されます — いずれかの編集が他のルールの fix と重複すると、グループ内のすべての編集がスキップされます:

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

## ルール作者向けヘルパー関数

`@markuplint/rules` の `src/helpers.ts` に属性削除パターン用の共有ヘルパーが提供されています:

| ヘルパー | 説明 |
|----------|------|
| `removeAttr(fixer, attr)` | 属性全体を削除（属性名 + 値 + 前後の空白） |
| `removeAttrValue(fixer, attr)` | 値部分のみ削除（等号、引用符、値）、属性名は残す |

これらは標準的な属性トークンプロパティ（`spacesBeforeName`、`nameNode`、`equal`、`valueNode` 等）を受け付け、null/空トークンを自動的に処理します。

## マルチパス Fix の動作

複数のルールが重複する fix を生成した場合、エンジンは反復的に適用します:

1. すべての fix を収集し、1パスで適用
2. 重複する fix はスキップ
3. スキップされた fix がある場合、ソースを再パース・再検証
4. スキップされた fix がなくなるまで繰り返す（最大10パス）

**ルール作者がこれを処理する必要はありません** — エンジンが重複解決を透過的に管理します。

## 自動修正をサポートする組み込みルール

v5 で自動修正をサポートする組み込みルール:

| ルール | 修正内容 |
|--------|----------|
| `case-sensitive-tag-name` | 設定されたケースにタグ名を変換 |
| `case-sensitive-attr-name` | 設定されたケースに属性名を変換 |
| `attr-value-quotes` | 設定されたスタイルに属性引用符を変換 |
| `no-boolean-attr-value` | 真偽値属性から値を削除 |
| `no-default-value` | デフォルト値を持つ属性を削除 |
| `no-duplicate-attr` | 重複属性を削除 |
| `no-ineffective-attr` | 無効な属性を削除 |
| `no-orphaned-end-tag` | 孤立した終了タグを削除 |
| `no-consecutive-br` | 連続する `<br>` 要素を削除 |

## 型のインポート

```typescript
import type { IRuleFixer, TextEdit, FixToken } from '@markuplint/ml-config';
```

これらの型は `@markuplint/ml-config` から再エクスポートされています。`IRuleFixer` はコールバックに渡されるため、自分でインスタンス化する必要はありません。
