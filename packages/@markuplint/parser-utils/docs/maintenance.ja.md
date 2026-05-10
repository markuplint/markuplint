# メンテナンスガイド

## コマンド

| コマンド                                      | 説明                   |
| --------------------------------------------- | ---------------------- |
| `yarn build --scope @markuplint/parser-utils` | このパッケージをビルド |
| `yarn dev --scope @markuplint/parser-utils`   | ウォッチモードでビルド |
| `yarn clean --scope @markuplint/parser-utils` | ビルド成果物を削除     |
| `yarn test --scope @markuplint/parser-utils`  | テストを実行           |

## テスト

テストファイルは `*.spec.ts` の命名規則に従い、ソースファイルと同じディレクトリに配置されています。主なテストパターンでは `nodeListToDebugMaps` を使用したスナップショット形式のアサーションを行います:

```ts
import { nodeListToDebugMaps } from '@markuplint/parser-utils';

const doc = parser.parse('<div class="foo">text</div>');
const debugMaps = nodeListToDebugMaps(doc.nodeList, true);
expect(debugMaps).toStrictEqual([
  // 期待されるデバッグ出力
]);
```

### テスト用デバッグユーティリティ

- **`nodeListToDebugMaps(nodeList, withAttr?)`** — ASTノードを位置情報付きのデバッグ文字列に変換
- **`attributesToDebugMaps(attributes)`** — 属性の分解を表示（名前、等号、値、引用符）
- **`nodeTreeDebugView(nodeTree, idFilter?)`** — 深さ、親子リンク付きのツリー可視化

## レシピ

### 1. 新しいパーサーの作成

1. `packages/@markuplint/` 配下に新しいパッケージを作成
2. `Parser<YourNode, YourState>` を拡張:

```ts
import { Parser } from '@markuplint/parser-utils';

class MyParser extends Parser<MyNode> {
  constructor() {
    super({
      endTagType: 'xml', // または 'omittable', 'never'
      tagNameCaseSensitive: true,
      ignoreTags: [
        // パース前にマスクするパターン
      ],
    });
  }

  tokenize() {
    const ast = myLanguageParser(this.rawCode);
    return { ast: ast.children, isFragment: true };
  }

  nodeize(originNode, parentNode, depth) {
    // ビジターメソッドを使用して言語固有のノードを変換
  }
}
```

3. `MLParserModule` としてエクスポート:

```ts
import { MyParser } from './parser.js';
export default { parser: new MyParser() };
```

完全なオーバーライドパターンのリファレンスは [Parser Class Reference — Implementing a Parser](parser-class.md#implementing-a-parser) を参照してください。

### 2. 新しいビジターメソッドの追加

ビジターメソッドは `nodeize()` から呼び出されます。新しいノードタイプのサポートを追加するには:

1. パーサーのサブクラスに適切なASTノードを作成するメソッドを追加
2. `nodeize()` の実装からそのメソッドを呼び出す
3. `this.createToken()` でトークンを作成し、`this.sliceFragment()` でソースフラグメントを抽出

### 3. IgnoreTag パターンの追加

パーサーのコンストラクタの `ignoreTags` 配列に追加:

```ts
super({
  ignoreTags: [
    { type: 'mustache', start: '{{', end: '}}' },
    { type: 'erb', start: '<%', end: '%>' },
    { type: 'Style', start: '<style', end: '</style>' },
  ],
});
```

- `type` は復元された psblock ノード名の `#ps:` プレフィックスになる
- `start` と `end` は文字列または正規表現パターンが使用可能
- マスク文字は `maskChar` オプションでカスタマイズ可能

### 4. 属性パースのカスタマイズ

カスタムオプションで `visitAttr()` をオーバーライド:

```ts
visitAttr(token: Token) {
  const attr = super.visitAttr(token, {
    quoteSet: [
      { start: '"', end: '"', type: 'string' },
      { start: "'", end: "'", type: 'string' },
      { start: '{', end: '}', type: 'script', parser: customParser },
    ],
    startState: AttrState.BeforeName,
  });

  // フレームワーク固有のディレクティブの後処理
  if (attr.type === 'attr' && attr.name.raw.startsWith('v-')) {
    this.updateAttr(attr, { isDirective: true });
  }

  return attr;
}
```

#### 引用符なし属性値の終端文字のカスタマイズ

`endOfUnquotedValueChars` のデフォルトは WHATWG HTML の "attribute value (unquoted) state" に準拠し、空白類と `>` のみが値を終端する。`/` は値の一部として扱われる。

ホスト言語が異なる規則を要求する場合はカスタムリストを渡す:

```ts
// Pug: 文字による終端を無効化 — Pug レクサが属性境界を既に区切っている
super.visitAttr(token, {
  quoteSet: [],
  endOfUnquotedValueChars: [],
});
```

```ts
// `/` を終端文字として扱う（例: `a=x/>` を属性 `a="x"` + 自己閉じ `/>` として読む）
super.visitAttr(token, {
  endOfUnquotedValueChars: ['\t', '\n', '\f', '\r', ' ', '/', '>'],
});
```

### 5. IDL属性マッピングの追加

IDL属性マップは `src/idl-attributes.ts` で定義されています。新しいマッピングを追加するには:

1. `idlContentMap` オブジェクトにエントリを追加
2. キーはIDLプロパティ名（camelCase）
3. 値はコンテンツ属性名（lowercase）

## 下流影響チェックリスト

このパッケージへの変更は下流のすべてのパーサーに影響します。直接サブクラスは本パッケージの `Parser` を継承し、Markdown 系サブクラスは `MarkdownAwareParser`（こちらも `Parser` を継承）を経由します。

| パッケージ                    | 主な依存関係                                                                                                                                           |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `@markuplint/html-parser`     | Parser 基底クラス、researchTags を使用した visitText                                                                                                   |
| `@markuplint/jsx-parser`      | Parser 基底クラス、quoteSet を使用した visitAttr、detectElementType、parseCodeFragment                                                                 |
| `@markuplint/vue-parser`      | Parser 基底クラス、visitAttr、flattenNodes、detectElementType                                                                                          |
| `@markuplint/svelte-parser`   | Parser 基底クラス、visitText、visitPsBlock、visitChildren、ignoreTags                                                                                  |
| `@markuplint/astro-parser`    | Parser 基底クラス（直接）、visitElement、**parseCodeFragment に要素全体の raw を渡す唯一の caller — raw-text element 本文の short-circuit 経路を踏む** |
| `@markuplint/pug-parser`      | Parser 基底クラス                                                                                                                                      |
| `@markuplint/markdown-parser` | Parser 基底クラス（MarkdownAwareParser 経由）                                                                                                          |
| `@markuplint/mdx-parser`      | Parser 基底クラス（MarkdownAwareParser 経由）、開始タグだけを切り出して parseCodeFragment に渡す                                                       |

Parser クラスを変更する際は、必ずすべてのパーサーパッケージでテストを実行してください:

```shell
yarn test --scope @markuplint/html-parser --scope @markuplint/jsx-parser \
  --scope @markuplint/vue-parser --scope @markuplint/svelte-parser \
  --scope @markuplint/astro-parser --scope @markuplint/pug-parser \
  --scope @markuplint/markdown-parser --scope @markuplint/mdx-parser
```

`parseCodeFragment`（特に raw-text element 分岐）に手を入れる場合は、`astro-parser` が最も影響を受けやすい caller — まずそこから確認してください。

## トラブルシューティング

### テンプレート式がパースエラーを引き起こす

**症状:** `<div class="{{ variable }}">` のようなコードでパースが失敗する。

**原因:** テンプレート式がHTMLパース前にマスクされていない。

**解決策:** パーサーのコンストラクタの `ignoreTags` に、式の構文に一致する `IgnoreTag` パターンを追加する。

### 属性パースが失敗する

**症状:** `SyntaxError: Unclosed attribute value` または類似のエラーが発生する。

**原因:** 非標準の属性クォート（例: JSX式のブレース）が設定されていない。

**解決策:** `visitAttr()` をオーバーライドし、その言語の式デリミタを含むカスタム `quoteSet` を渡す。

### フロントマターが検出されない

**症状:** YAMLフロントマターが psblock ではなくテキストノードとして表示される。

**原因:** パースオプションで `ignoreFrontMatter` が有効になっていない。

**解決策:** `parse()` を呼び出す際に `options.ignoreFrontMatter` が `true` であることを確認する。注意: Svelte はこれを明示的に無効にしています。

### `<script>` または `<style>` 本文で `parseCodeFragment` が `Invalid tag syntax` を throw する

**症状:** 要素全体の raw を `parseCodeFragment()` に渡すサブクラス（例: `astro-parser`）で、script/style 本文に HTML 風部分文字列（`/<br\s*\/?>/gi` や `/* <br = */` など）が含まれると `SyntaxError: Invalid tag syntax: "..."` が throw する。元の報告は [#3825](https://github.com/markuplint/markuplint/issues/3825)。

**原因:** raw-text 認識がないと `parseCodeFragment()` は本文を再トークナイズし、正規表現中の `<br...>` をタグ開始と解釈、続く `\s`（リテラルなバックスラッシュ）を属性名とみなして throw する。

**解決策:** 修正は `parseCodeFragment()`（`src/parser.ts`）内に住んでいる。自閉でない開始タグの `nodeName.toLowerCase()` が `rawTextElements` に含まれる場合、本文は次に現れる ASCII 大文字小文字非依存の `</tagName`（タブ/LF/FF/CR/空白/`>` /`/` のいずれかが続く）まで丸ごと消費される（[HTML Living Standard §13.2.5.1](https://html.spec.whatwg.org/multipage/syntax.html#cdata-rcdata-restrictions)）。リグレッションが疑われたら:

1. リグレッションスイートを再実行: `npx vitest run packages/@markuplint/astro-parser/src/parser.spec.ts -t "#3825"`。
2. `parseCodeFragment()` を確認 — raw-text 分岐が無傷か、`#getRawTextCloseTagPattern()` のキャッシュが参照されているか、close-tag 正規表現がまだ仕様の文字クラス `[\t\n\f\r >/]` を使っているかをチェック。
3. `#3825 raw-text element body via ... expression child` の jsx/mdx 防衛テストは上流 invariant の lock-in が目的で、parser-utils の raw-text 分岐自体は経由しない（本文が expression child として処理されるため）。

**Escapable raw text 要素 (`<title>`, `<textarea>`) について**: 既定の `rawTextElements` には含めていません。HTML LS では escapable raw text として分類され、本文中の文字参照（`&amp;` 等）の展開が要求されますが、本ブランチではその展開を実装していません。意図的に `rawTextElements` に追加する場合は、本文中の文字参照が decode されず raw のまま渡されることを許容してください。
