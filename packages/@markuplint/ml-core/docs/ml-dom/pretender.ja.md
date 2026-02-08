# MLDOM における Pretender システム

**主要ソース:** `src/ml-dom/node/element.ts`（`pretending()`、`matchMLSelector()`、プロパティゲッター）
**関連:** `src/ml-dom/node/document.ts`（`_pretending()`）、`src/ml-dom/helper/accname.ts`（`getAccnameFromPretender()`）

## 概要

Pretender システムは、著者定義コンポーネント（例: `<MyButton>`、`<AppLink>`）をリント時に標準 HTML 要素（例: `<button>`、`<a>`）として扱えるようにします。これは HTML セマンティクスに依存するルール — `wai-aria`（アクセシブル名/ロールの検証）や `permitted-contents`（コンテンツモデルの検証）など — がフレームワークコンポーネントに対して正しく動作するために不可欠です。

このシステムは、標準 HTML 要素を表す**仮想 MLElement** を作成し、元のコンポーネント要素と仮想要素の間に**双方向リンク**を確立することで機能します。MLDOM のプロパティゲッターやメソッドはこのリンクを確認し、適切な場合に透過的に pretender のデータを返します。

Pretender の設定構文については、[markuplint 設定ドキュメント](https://markuplint.dev/docs/configuration/properties#pretenders)を参照してください。

## アーキテクチャ

### 初期化フロー

Pretender の初期化は `MLDocument` のコンストラクション中に、すべてのノードが作成された後、ルールマッピングの前に行われます：

```
MLDocument コンストラクタ
  ├── 1. AST をパース → MLDOM ノードを作成（nodeList）
  ├── 2. _pretending(pretenders)          ← Pretender の初期化
  │     └── nodeList の各 ELEMENT_NODE に対して:
  │           └── element.pretending(pretenders)
  └── 3. _ruleMapping(ruleset)            ← ルールの割り当て
```

この順序は意図的です：pretender はルールマッピングの**前に**確立される必要があります。なぜなら、ルールセレクタ（例: `button` をターゲットにした `nodeRules`）は pretender のアイデンティティに対してマッチする必要があるためです。

### `pretending()` メソッド

`MLElement` の `pretending()` メソッドがコアの初期化ロジックです。ドキュメントのコンストラクション中に、要素ごとに1回呼び出されます。

**ステップ 1: マッチする設定を検索**

```typescript
const pretenderConfig = pretenders?.find(option => this.matches(option.selector));
```

Pretender 設定を反復し、CSS セレクタがこの要素にマッチする最初の設定を見つけます。

**ステップ 2: `as` 属性によるフォールバック**

```typescript
const asAttrValue = this.getAttribute('as');
const pretenderElement =
  pretenderConfig?.as ??
  (this.elementType === 'html' || !asAttrValue ? null : { element: asAttrValue, inheritAttrs: true });
```

明示的な設定がマッチしないが、要素が非 HTML 要素（つまり `elementType !== 'html'`）で `as` 属性を持つ場合、その属性値をフォールバックとして使用します。これにより、明示的な設定なしで `<MyButton as="button">` が動作します。

**ステップ 3: Pretender 定義の解決**

`as` フィールドは単純な文字列（タグ名）か、詳細オプションを持つ `OriginalNode` オブジェクトのいずれかです：

| フィールド               | 型               | 説明                                              |
| ------------------------ | ---------------- | ------------------------------------------------- |
| `element`                | `string`         | ターゲットの HTML タグ名（例: `"button"`、`"a"`） |
| `namespace`              | `string?`        | SVG 要素の場合 `'svg'`。デフォルトは `'html'`     |
| `inheritAttrs`           | `boolean?`       | 元の要素の属性を仮想要素にコピーする              |
| `attrs`                  | `Array?`         | 仮想要素に追加する属性                            |
| `attrs[].value.fromAttr` | `string?`        | 元の要素の指定された属性から値を継承する          |
| `aria`                   | `PretenderARIA?` | アクセシブル名の設定                              |

**ステップ 4: 仮想要素の作成**

合成 AST ノードで新しい `MLElement` が構築されます：

```typescript
const as = new MLElement<T, O>(
  {
    ...this._astToken,
    uuid: this.uuid + '_pretender',
    raw: `<${nodeName}>`,
    nodeName,
    namespace,
    elementType: 'html',
    attributes, // inheritAttrs + attrs からマージ
  },
  this.ownerMLDocument,
);
```

仮想要素は元の要素の AST トークンをベースとして再利用し（ソース位置を継承）、タグ名、名前空間、属性をオーバーライドします。

**ステップ 5: 双方向リンクの設定**

```typescript
as.pretenderContext = { type: 'origin', origin: this };
this.pretenderContext = { type: 'pretender', as, aria };
```

**ステップ 6: 子ノードの共有**

```typescript
as.resetChildren(this.childNodes);
```

仮想要素は元の要素の子ノードを受け取り、コンテンツモデルの検証が同じ子に対して動作するようにします。

### `pretenderContext` 型

```typescript
// 元の要素上（例: <MyButton>）
{ type: 'pretender', as: MLElement, aria?: PretenderARIA }

// 仮想要素上（例: 合成された <button>）
{ type: 'origin', origin: MLElement }

// 非参加
null
```

## プロパティの委譲

`pretenderContext.type === 'pretender'` の場合、いくつかの `MLElement` プロパティゲッターが仮想要素に委譲します：

### 名前プロパティ

```
<MyButton>  (pretenderContext.type === 'pretender', as → <button>)

localName  → this.pretenderContext.as.localName  → "button"
nodeName   → this.pretenderContext.as.nodeName   → "BUTTON"
tagName    → this.pretenderContext.as.nodeName   → "BUTTON"
rawName    → this._astToken.nodeName             → "MyButton"（影響なし）
```

`rawName` はソースを常に反映する唯一の名前プロパティです。これにより、元のタグ名を必要とするルール（例: 命名規則ルール）が引き続きアクセスできます。

### 属性アクセス

| メソッド/プロパティ           | Pretender 時の動作                                                              |
| ----------------------------- | ------------------------------------------------------------------------------- |
| `attributes`                  | **仮想要素の**属性を返す（重複排除済み）                                        |
| `getAttributeTokens()`        | **仮想要素の**属性トークンを返す                                                |
| `getAttribute(name)`          | **仮想要素の**属性を検索する                                                    |
| `hasAttribute(name)`          | **仮想要素**の `getAttribute` に委譲する                                        |
| `getAttributePretended(name)` | Pretender コンテキストを**無視**し、**元の**要素の `#attributes` を直接検索する |

`getAttributePretended()` はアクセシブル名の計算のために特別に設計されています。pretender の `aria.name` が `{ fromAttr: "label" }` を指定している場合、システムは仮想 `<button>` からではなく、元の `<MyButton label="Save">` の `label` 属性を読み取る必要があります。

### ルール設定

`rule` ゲッターは**逆方向**の特殊な委譲を持ちます：

```typescript
// 仮想要素上（type === 'origin'）：
get rule() {
  return this.pretenderContext.origin.rule;  // 元の要素に委譲
}
```

これは、ルールが仮想要素で `element.rule` にアクセスすると、元の要素のルール設定を取得することを意味します。ルールはセレクタマッチングによってノードにマッピングされ、ルールマッピングはドキュメントの `nodeList` に存在する元の要素をターゲットにし、仮想要素はターゲットにしないためです。

## セレクタマッチング

### 2段階マッチング

`matchMLSelector()` は pretender 要素に対して2段階戦略を実装します：

```
フェーズ 1: Pretender のアイデンティティとしてマッチ
  セレクタ "button"  →  <button>（仮想）に対してマッチ  →  ヒット

フェーズ 2: 元のアイデンティティとしてマッチ（フェーズ 1 がミスした場合のみ）
  セレクタ "MyButton"  →  一時的に pretenderContext を null にする
                        →  <MyButton>（元）に対してマッチ  →  ヒット
                        →  pretenderContext を復元する
```

これにより、両方のターゲティング戦略が機能します：

- **`button`** がマッチ：セマンティック要素をターゲットにしたルール（例: `<button>` の ARIA ルール）
- **`MyButton`** がマッチ：コンポーネントをターゲットにしたルール（例: `MyButton` の `nodeRules`）

### ルールマッピングへの影響

`matchMLSelector()` はルールマッピングフェーズで `RuleMapper` によって使用されるため、pretender 対応のマッチングは以下を意味します：

- `selector: "button"` の `nodeRules` エントリは、`<MyButton>` が `<button>` として振る舞う場合にマッチする
- `selector: "MyButton"` の `nodeRules` エントリもマッチする。フェーズ 2 が元のアイデンティティにフォールバックするため

## アクセシブル名の計算

`getAccname()` ヘルパーは `getAccnameFromPretender()` を通じて pretender システムと統合されます：

```
getAccname(element)
  ├── 1. @markuplint/ml-spec の get() を試行（標準 ARIA 計算）
  ├── 2. getAccnameFromPretender(element) を試行   ← Pretender 固有
  │     └── pretenderContext.type === 'pretender'
  │         かつ pretenderContext.aria?.name が存在する場合:
  │           ├── aria.name === true → "some-name(Pretender Options)"
  │           └── aria.name === { fromAttr: "label" }
  │               → el.getAttributePretended("label")
  │               → 元の要素の属性から読み取る
  ├── 3. aria-hidden/hidden をチェック → ""
  ├── 4. accessibleNameFromContent をチェック → 子テキストの再帰的結合
  └── 5. デフォルト → ""
```

重要な設計上の選択として、`getAccnameFromPretender()` は `el.getAttribute(attrName)` **ではなく** `el.getAttributePretended(attrName)` を呼び出し、pretender コンテキストをバイパスして元の要素から属性を読み取ります。これは `label` 属性が仮想 `<button>` ではなく元の `<MyButton label="Save">` に存在するためです。

## `toString(fixed)` への影響

`fixed=true` の場合、`MLElement.toString()` は pretender 要素に対して**生のソース**を返します：

```typescript
if (this.pretenderContext?.type === 'pretender') {
  return this.raw;
}
```

pretender は仮想的な構成物であるため、これは正しい動作です — pretender のアイデンティティに対して「修正」すべきソースコードはありません。元のタグ `<MyButton>` は出力で変更されずに残るべきです。

## `walkOn()` への影響

Pretender システムによって作成された仮想要素はドキュメントの `nodeList` に**含まれません**。元の要素（`<MyButton>`）のみが走査されます。`localName`、`nodeName`、その他のプロパティが pretender に委譲するため、ルールは走査された要素にアクセスする際に pretender のアイデンティティを確認できます。

```
document.walkOn('Element', el => {
  // el は <MyButton> だが:
  // el.localName === "button"    （pretender から）
  // el.rawName === "MyButton"    （元の要素から）
  // el.attributes は継承 + 設定された属性を含む
});
```

## データフロー図

```
設定（pretenders 配列）
        │
        ▼
MLDocument._pretending()
        │
        ▼（nodeList の各要素に対して）
MLElement.pretending()
        │
        ├─ セレクタで一致する設定を検索
        ├─ フォールバック: `as` 属性を持つ非 HTML 要素
        │
        ▼
仮想 MLElement を作成
        │
        ├─ タグ名、名前空間は設定から
        ├─ 属性: inheritAttrs + 明示的属性
        └─ 子: 元の要素と共有
        │
        ▼
双方向リンク
        │
        ├─ Original.pretenderContext = { type: 'pretender', as: virtual, aria }
        └─ Virtual.pretenderContext  = { type: 'origin', origin: original }
        │
        ▼
プロパティ委譲が有効化
        │
        ├─ localName, nodeName, tagName → 仮想要素
        ├─ attributes, getAttributeTokens() → 仮想要素
        ├─ rawName, fixedNodeName → 元の要素（影響なし）
        ├─ matchMLSelector() → 2段階（仮想を先に、次に元）
        ├─ rule（仮想要素上） → 元の要素に委譲
        ├─ getAccname() → pretender ARIA 設定 → getAttributePretended()
        └─ toString(fixed) → raw（修正は適用されない）
```
