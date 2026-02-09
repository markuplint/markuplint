# ルールシステム

`@markuplint/ml-core` のルールフレームワークの詳細リファレンスです。

## 概要

ルールフレームワークはリントルールの完全なライフサイクルを処理します：定義、設定、ノードへのマッピング、実行、違反収集。主要コンポーネント：

- **RuleSeed** — ルール定義型（verify/fix 関数 + デフォルト値）
- **MLRule** — ルール実行クラス（シードを名前と設定解決でラップ）
- **MLRuleContext** — ルールの実行コンテキスト（ドキュメントアクセス、翻訳、違反報告）
- **RuleMapper** — セレクタ詳細度に基づいてルール設定を特定の DOM ノードにマッピング
- **Ruleset** — Config から rules、nodeRules、childNodeRules を抽出

## RuleSeed

ソース: `src/ml-rule/types.ts`

`RuleSeed<T, O>` 型はルールの実装を定義します。

```typescript
type RuleSeed<T extends RuleConfigValue = boolean, O extends PlainData = undefined> = {
  readonly meta?: {
    readonly category?: 'validation' | 'style' | 'naming-convention' | 'a11y' | 'maintainability';
  };
  readonly defaultSeverity?: Severity;
  readonly defaultValue?: T;
  readonly defaultOptions?: O;
  verify(context: ProvidedContext<T, O>): void | Promise<void>;
  fix?(context: ProvidedContext<T, O>): void | Promise<void>;
};
```

### カテゴリ値

| カテゴリ              | 説明                                 |
| --------------------- | ------------------------------------ |
| `'validation'`        | HTML 標準準拠チェック                |
| `'style'`             | コードスタイルとフォーマットのルール |
| `'naming-convention'` | 命名規則の強制                       |
| `'a11y'`              | アクセシビリティチェック             |
| `'maintainability'`   | コード保守性のルール                 |

### デフォルト値

- `defaultSeverity` — 未指定の場合 `'error'`
- `defaultValue` — 未指定の場合 `true`
- `defaultOptions` — 未指定の場合 `undefined`

## createRule

ソース: `src/ml-rule/create-rule.ts`

型安全なルールシード作成のためのファクトリ関数：

```typescript
function createRule<T extends RuleConfigValue, O extends PlainData = undefined>(
  seed: Readonly<RuleSeed<T, O>>,
): RuleSeed<T, O>;
```

シードをそのまま返します。主に TypeScript の型推論のためのヘルパーとして機能します。

### 使用例

```typescript
import { createRule } from '@markuplint/ml-core';

export default createRule({
  defaultSeverity: 'error',
  defaultValue: true,
  async verify({ document, report, t }) {
    await document.walkOn('Element', el => {
      if (/* 違反条件 */) {
        report({ scope: el, message: t('エラーメッセージ') });
      }
    });
  },
});
```

## MLRule

ソース: `src/ml-rule/ml-rule.ts`

`MLRule<T, O>` は `RuleSeed` を名前でラップし、設定解決と検証実行を提供します。

### コンストラクタ

```typescript
constructor(o: Readonly<RuleSeed<T, O>> & { readonly name: string })
```

### プロパティ

| プロパティ        | 型         | 説明                                               |
| ----------------- | ---------- | -------------------------------------------------- |
| `name`            | `string`   | ルール識別子（例：`"attr-duplication"`）           |
| `defaultSeverity` | `Severity` | デフォルトの重大度レベル（シードまたは `'error'`） |
| `defaultValue`    | `T`        | デフォルト設定値（シードまたは `true`）            |
| `defaultOptions`  | `O`        | デフォルトオプション（シードから）                 |

### メソッド

#### `verify(document, locale, fix): Promise<Violation[]>`

ドキュメントに対してルールを実行します。

**フロー:**

1. `document.setRule(this)` — ドキュメントに現在のルールコンテキストを設定
2. `new MLRuleContext(document, locale)` — 実行コンテキストを作成
3. `context.provide()` — 提供可能なコンテキストオブジェクトを生成
4. `await seed.verify(context)` — 検証を実行
5. `await seed.fix(context)` — 修正を実行（`fix=true` かつ fix 関数がある場合）
6. `context.reports` → `Violation[]` — レポートを違反にマッピング
7. `document.setRule(null)` — ルールコンテキストをクリア

**Report → Violation のマッピング:**

- スコープベースのレポート: `report.scope`（ノード）から `line`, `col`, `raw` を抽出、重大度は `report.scope.rule.severity` から
- 直接レポート: `report.line`, `report.col`, `report.raw` を直接使用、重大度は `document.rule.severity` から

#### `getRuleInfo(ruleSet, ruleName): GlobalRuleInfo<T, O>`

ルールセットから完全なルール情報を解決します。

戻り値:

```typescript
{
  ...RuleInfo<T, O>,               // グローバルルール設定
  nodeRules: RuleInfo<T, O>[],     // 無効でないノードレベルのオーバーライド
  childNodeRules: RuleInfo<T, O>[], // 無効でない子ノードレベルのオーバーライド
}
```

#### `optimizeOption(configSettings): RuleInfo<T, O>`

生のルール設定を解決済み `RuleInfo` に正規化します。

| 入力                       | 結果                                                                                          |
| -------------------------- | --------------------------------------------------------------------------------------------- |
| `undefined` または `false` | `{ disabled: true, severity: デフォルト, value: デフォルト, options: デフォルト }`            |
| `true`                     | `{ disabled: false, severity: デフォルト, value: デフォルト, options: デフォルト }`           |
| `RuleConfig` オブジェクト  | `{ disabled: false, severity: 設定/デフォルト, value: 設定/デフォルト, options: マージ済み }` |
| プリミティブ値             | `{ disabled: false, severity: デフォルト, value: 入力値, options: デフォルト }`               |

オプションのマージ: 配列はスプレッド（`[...a, ...b]`）、オブジェクトはスプレッド（`{...a, ...b}`）、それ以外は `b ?? a` にフォールバック。

## MLRuleContext

ソース: `src/ml-rule/ml-rule-context.ts`

`MLRuleContext<T, O>` はルールの実行コンテキストを提供します。

### コンストラクタ

```typescript
constructor(document: MLDocument<T, O>, locale: LocaleSet)
```

ロケールから翻訳関数を作成し、ドキュメント参照を保存します。

### プロパティ

| プロパティ  | 型                 | 説明                    |
| ----------- | ------------------ | ----------------------- |
| `document`  | `MLDocument<T, O>` | 検証対象のドキュメント  |
| `locale`    | `string`           | ロケール文字列          |
| `translate` | `Translator`       | i18n メッセージ翻訳関数 |

### `provide(): ProvidedContext`

`RuleSeed.verify()` と `RuleSeed.fix()` に渡されるコンテキストオブジェクトを返します：

```typescript
{
  document: MLDocument<T, O>,
  translate: Translator,
  t: Translator,        // translate のエイリアス
  reports: Report<T, O>[],
  report: (report) => void | boolean,
}
```

### `report(report)`

2 つのオーバーロード：

1. **直接レポート**（`Report<T, O>`）: レポートを直接プッシュ。`undefined` を返す。
2. **チェッカーレポート**（`CheckerReport<T, O>`）: 翻訳関数で関数を呼び出す。レポートが返された場合プッシュして `true` を返す。`null`/`undefined` の場合 `false` を返す。

### 重複排除

レポートは `_push()` で以下の基準で重複排除されます：

- **スコープベース**: 同じ `scope` オブジェクト + 同じ `message`
- **位置ベース**: 同じ `col` + `line` + `message` + `raw`

### メッセージの最終処理

英語ロケール（`'en'`）の場合、最初の小文字が大文字に変換されます。他のロケールはそのまま通過します。

## チェッカー型

ソース: `src/ml-rule/types.ts`

チェッカー関数を構築するためのユーティリティ型：

| 型                        | シグネチャ                                                   | 説明               |
| ------------------------- | ------------------------------------------------------------ | ------------------ |
| `Checker<T, O, P>`        | `(params: P) => CheckerReport<T, O>`                         | 汎用チェッカー     |
| `ElementChecker<T, O, P>` | `(params: P & { el: Element<T, O> }) => CheckerReport<T, O>` | 要素固有チェッカー |
| `AttrChecker<T, O, P>`    | `(params: P & { attr: Attr<T, O> }) => CheckerReport<T, O>`  | 属性固有チェッカー |
| `CheckerReport<T, O>`     | `(t: Translator) => Report<T, O> \| undefined \| null`       | 遅延レポート関数   |

## ルールマッピング

`RuleMapper`、ルール設定の解決（`rules`、`nodeRules`、`childNodeRules` の3層処理）、詳細度ベースの競合解決、マージ動作、正規表現セレクタのテンプレート変数についての詳細なドキュメントは、専用の[ルールマッピング](./ml-dom/rule-mapping.ja.md)リファレンスを参照してください。

## Ruleset

ソース: `src/ruleset/index.ts`

`Config` オブジェクトからルール設定を抽出します。

```typescript
class Ruleset {
  readonly rules: Rules;
  readonly nodeRules: readonly NodeRule[];
  readonly childNodeRules: readonly ChildNodeRule[];

  constructor(config: Config);
}
```

- `rules` — グローバルルール定義（`config.rules` から、デフォルトは `{}`）
- `nodeRules` — ノード固有のオーバーライド（`config.nodeRules` から、デフォルトは `[]`）
- `childNodeRules` — 子ノード固有のオーバーライド（`config.childNodeRules` から、デフォルトは `[]`）

## テストユーティリティ

ソース: `src/ml-rule/create-test-rule.ts`

### createTestRule

```typescript
function createRule<T, O>(seed: Readonly<RuleSeed<T, O>> & { readonly name: string }): MLRule<T, O>;
```

テスト用の `MLRule` インスタンスを作成します。`create-rule.ts` の `createRule()` とは異なり、`name` プロパティが必須で、実際の `MLRule` インスタンスを返します。

### テストパターン

```typescript
import { createRule } from '@markuplint/ml-core/test';
import { createTestDocument } from '@markuplint/ml-core/test';

const rule = createRule({
  name: 'my-rule',
  defaultSeverity: 'error',
  async verify({ document, report, t }) {
    // 検証ロジック
  },
});

const doc = createTestDocument('<div></div>');
const violations = await rule.verify(doc, { locale: 'en' }, false);
```
