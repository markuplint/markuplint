# MLDOM 概要

## 概要

MLDOM は DOM Standard に準拠した抽象化レイヤーで、`@markuplint/ml-ast` の AST ノードを DOM インターフェース実装クラスにラップします。各 MLDOM クラスは対応する DOM API（`Node`、`Element`、`Document` など）を提供しつつ、ルール格納、トークンレベルのソース追跡、アクセシブル名の計算など markuplint 固有の機能で拡張しています。

すべての MLDOM クラスは2つの型パラメータを持つジェネリクスです：

- `T extends RuleConfigValue` -- ルール設定値の型
- `O extends PlainData` -- ルールオプションの型

これらのジェネリクスは **`createRule` のためだけに存在**します。ノードツリー全体に伝播することで、サードパーティのルール作成者が `verify()` / `fix()` コールバック内で `node.rule` に型安全にアクセスできるようにしています：

```typescript
// サードパーティルール -- T = 'always' | 'never', O = { allow: string[] }
export default createRule<'always' | 'never', { allow: string[] }>({
  defaultValue: 'always',
  defaultOptions: { allow: [] },
  async verify({ document, report, t }) {
    await document.walkOn('Element', el => {
      // el.rule の型は RuleInfo<'always' | 'never', { allow: string[] }>
      const { value, options } = el.rule;
      //      ^'always'|'never'  ^{ allow: string[] }
    });
  },
});
```

型の伝播経路: `createRule<T, O>` → `RuleSeed<T, O>` → `MLRuleContext<T, O>` → `MLDocument<T, O>` → `walkOn` ウォーカー → `MLElement<T, O>` → `el.rule: RuleInfo<T, O>`

#### ランタイムの実態: 意図的に dirty な実装

ジェネリクスはすべての MLDOM クラスに存在しますが、**ランタイム実装は型安全性を完全にバイパス**しています。これは意図的で実用的な設計上の選択です：

1. **`node.rules` は型なし**: `Record<string, AnyRule>` として宣言（`node.ts` 190行目）
2. **`RuleMapper` は `<any, any>` を使用**: マッパーは `MLNode<any, any>` を受け取り、型制約なしでルールを代入（`rule-mapper.ts` 47行目: `node.rules[ruleName] = rule.rule`）
3. **型安全性はキャストで回復**: `node.rule` ゲッターが格納されたルールを `as Rule<T, O>` でキャストし、型付きの `RuleInfo<T, O>` を生成（`node.ts` 514行目: `settingRule as Rule<T, O>`）

```
コンパイル時:  MLNode<T, O>  →  node.rule: RuleInfo<T, O>  ← ルール作成者にとって型安全
                   ↕
ランタイム:    node.rules = Record<string, AnyRule>  ← 型なしストレージ
               RuleMapper は <any, any> でルールを代入  ← ジェネリクスを無視
               node.rule ゲッターが `as Rule<T, O>` でキャスト  ← 型を回復
```

初めてコードベースを見る開発者は、すべての MLDOM クラスに `<T, O>` が存在するのにランタイムで実際に制約されている箇所が見つからず困惑するかもしれません。答えは：ランタイムでは制約されていません。ジェネリクスは `createRule` を使用するサードパーティのルール作成者の DX のためだけに存在する、コンパイル時のみのメカニズムです。

### UnexpectedCallError

MLDOM クラスは TypeScript 組み込みの DOM 型インターフェース（例: `MLNode implements Node`、`MLElement implements Element`）を実装しています。この `implements` 宣言は**メンテナンス戦略**です。DOM インターフェースへの準拠を宣言することで、TypeScript の型チェッカーが MLDOM クラスを DOM API サーフェスと同期させ続けることを保証します。組み込み DOM 型定義が更新された場合（例: `Element` に新しいプロパティが追加された場合）、コンパイラがエラーを報告し、気づかないうちにギャップが生じることを防ぎます。

静的解析のコンテキストでは意味を持たない DOM メソッド（markuplint のルールやカスタムルールで使用される可能性が低いもの）は、呼び出されると `UnexpectedCallError` をスローします。これにはミューテーションメソッド（`appendChild`、`removeChild`）、イベントメソッド（`addEventListener`、`dispatchEvent`）、レイアウト依存プロパティ（`clientHeight`、`offsetWidth`）が含まれます。

## クラス階層

```
MLToken<A extends MLASTToken>
  └── MLNode<T, O, A extends MLASTNode>  (abstract, implements Node)
        ├── MLAttr<T, O>  (implements Attr)
        ├── MLCharacterData<T, O, A>  (abstract, implements CharacterData)
        │     ├── MLText<T, O>  (implements Text)
        │     └── MLComment<T, O>  (implements Comment)
        ├── MLDocumentType<T, O>  (implements DocumentType)
        ├── MLBlock<T, O>
        ├── MLElementCloseTag<T, O>
        └── MLParentNode<T, O, A>  (abstract, implements ParentNode)
              ├── MLElement<T, O>  (implements Element, HTMLElement)
              ├── MLDocumentFragment<T, O>  (implements DocumentFragment)
              └── MLDocument<T, O>  (implements Document)
```

## MLToken

**ソース:** `src/ml-dom/token/token.ts`

基底トークンクラスで、`MLASTToken` を位置情報でラップし、元の文字列（raw）と修正済み（fixed）の文字列表現を提供します。これはすべての MLDOM ノードの基盤です。

### プロパティ

| プロパティ    | 型       | 説明                                                                          |
| ------------- | -------- | ----------------------------------------------------------------------------- |
| `uuid`        | `string` | このトークンの一意な識別子                                                    |
| `raw`         | `string` | 元のソーステキスト（不変）                                                    |
| `fixed`       | `string` | 修正済みのソーステキスト。初期値は `raw` と同じ。`fix()` メソッドで更新される |
| `startLine`   | `number` | 1始まりの開始行番号                                                           |
| `endLine`     | `number` | 1始まりの終了行番号                                                           |
| `startCol`    | `number` | 1始まりの開始列番号                                                           |
| `endCol`      | `number` | 1始まりの終了列番号                                                           |
| `startOffset` | `number` | 0始まりの開始文字オフセット                                                   |
| `endOffset`   | `number` | 0始まりの終了文字オフセット                                                   |

### メソッド

| メソッド   | シグネチャ                          | 説明                                                        |
| ---------- | ----------------------------------- | ----------------------------------------------------------- |
| `fix`      | `fix(raw: string): void`            | リント自動修正用に `fixed` を修正内容で更新する             |
| `toString` | `toString(fixed?: boolean): string` | `true` の場合 `fixed` の内容を、そうでなければ `raw` を返す |

### 座標系

オフセットは0始まり（0からカウント）、行と列は1始まり（1からカウント）です。これはほとんどのテキストエディタやエラーレポーターで使用される慣例に一致しています。
