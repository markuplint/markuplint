# ルールマッピング — ルールがノードに適用される仕組み

**ソース:** `src/ml-dom/node/document.ts`（`_ruleMapping()`）、`src/ml-dom/node/rule-mapper.ts`（`RuleMapper`）

## 概要

ルールマッピングは、ユーザーの設定からルール設定を個々の MLDOM ノードに配布するプロセスです。各ノードには `rules` プロパティ（`Record<string, AnyRule>`）があり、そのノードに適用されるすべてのルールの解決済み設定を格納します。

マッピングは3つの設定レイヤー — `rules`、`nodeRules`、`childNodeRules` — を定義された順序で処理し、CSS セレクタの詳細度を使用して競合を解決します。

設定構文については、[markuplint 設定ドキュメント](https://markuplint.dev/docs/configuration)を参照してください。

## アーキテクチャ

### ルールマッピングが実行されるタイミング

ルールマッピングは `MLDocument` のコンストラクション中に、pretender の初期化後、ルール実行の前に**一度だけ**実行されます：

```
MLDocument コンストラクタ
  ├── 1. AST をパース → MLDOM ノードを作成（nodeList）
  ├── 2. _pretending(pretenders)
  ├── 3. _ruleMapping(ruleset)            ← ルールマッピング
  └── 4.（ルール検証の準備完了）
```

この順序は重要です：

- Pretender が先に確立されている必要があります。これにより、ルールマッピングでのセレクタマッチングが pretender のアイデンティティに対してマッチできます（例: `button` をターゲットにした `nodeRules` エントリが、`<button>` として振る舞う `<MyButton>` にマッチする）
- ルールマッピングは検証前に完了する必要があります。ルールが `walkOn()` 中に `node.rules` を読み取れるようにするためです

### コンポーネント

| コンポーネント   | ソース                           | 役割                                                             |
| ---------------- | -------------------------------- | ---------------------------------------------------------------- |
| `Ruleset`        | `src/ruleset/index.ts`           | ユーザー設定から `rules`、`nodeRules`、`childNodeRules` を抽出   |
| `RuleMapper`     | `src/ml-dom/node/rule-mapper.ts` | 詳細度付きのルールからノードへのマッピングを蓄積し、ノードに適用 |
| `_ruleMapping()` | `src/ml-dom/node/document.ts`    | 3層処理のオーケストレーション                                    |

## 3つのレイヤー

### レイヤー 1: グローバルルール（`rules`）

```json
{
  "rules": {
    "attr-duplication": true,
    "case-sensitive-tag-name": "warning"
  }
}
```

グローバルルールは `#document` ノード自体を含むドキュメント内の**すべてのノード**に適用されます。固定の詳細度 `[0, 0, 0]` を持ちます。

**処理：**

```typescript
// #document に適用
for (const ruleName of Object.keys(ruleset.rules)) {
  ruleMapper.set(document, ruleName, {
    from: 'rules',
    specificity: [0, 0, 0],
    rule,
  });
}

// nodeList のすべてのノードに適用
for (const node of document.nodeList) {
  for (const ruleName of Object.keys(ruleset.rules)) {
    ruleMapper.set(node, ruleName, {
      from: 'rules',
      specificity: [0, 0, 0],
      rule,
    });
  }
}
```

### レイヤー 2: ノードルール（`nodeRules`）

```json
{
  "nodeRules": [
    {
      "selector": "img",
      "rules": {
        "required-attr": { "value": "alt" }
      }
    }
  ]
}
```

ノードルールは**セレクタにマッチする要素**に対してグローバルルールをオーバーライドします。`ELEMENT_NODE` と `TEXT_NODE` のみが対象です。テキストノードはセレクタのターゲットになれないため、実際にマッチするのは要素のみです。

**処理：**

1. 各 `nodeRule` エントリについて、`matchMLSelector(selector)` で現在の要素がマッチするかチェック
2. マッチした場合、エントリ内の各ルールに対して：
   - `exchangeValueOnRule(rule, matches.data)` — 正規表現セレクタのキャプチャから Mustache テンプレート変数をレンダリング
   - `mergeRule(globalRule, convertedRule)` — グローバルルール設定とマージ（[マージ](#グローバルルールとのマージ)を参照）
   - `ruleMapper.set(node, ruleName, { from: 'nodeRules', specificity: matches.specificity, rule: mergedRule })`

詳細度は要素をマッチさせるために使用された CSS セレクタから取得されます。

### レイヤー 3: 子ノードルール（`childNodeRules`）

```json
{
  "childNodeRules": [
    {
      "selector": "table",
      "inheritance": true,
      "rules": {
        "class-naming": "/^table-/"
      }
    }
  ]
}
```

子ノードルールは、マッチした要素の**子（または子孫）**にルールを適用します。セレクタは**親**にマッチし、ルールはその子に配布されます。

**処理：**

1. 各 `childNodeRule` エントリについて、`matchMLSelector(selector)` で現在の要素がマッチするかチェック
2. マッチした場合、ターゲットノードを決定：
   - `inheritance: true` → すべての**子孫**（`syncWalk` で収集）
   - `inheritance: false`（デフォルト）→ **直接の子**のみ（`childNodes`）
3. エントリ内の各ルールについて、マージされたルールをすべてのターゲットノードに適用

```typescript
const targetDescendants = nodeRule.inheritance ? descendants : children;

for (const descendant of targetDescendants) {
  ruleMapper.set(descendant, ruleName, {
    from: 'childNodeRules',
    specificity: matches.specificity,
    rule: mergedRule,
  });
}
```

注：詳細度は子ではなく**親の**セレクタマッチのものです。

## 処理順序

3つのレイヤーは `_ruleMapping()` 内で特定の順序で処理されます：

```
#document ノードに対して:
  1. すべてのグローバルルールを適用（詳細度 [0,0,0]）

nodeList の各ノードに対して:
  2. すべてのグローバルルールを適用（詳細度 [0,0,0]）
  3. マッチする nodeRules を適用（セレクタの詳細度）
  4. マッチする childNodeRules を適用（親のセレクタの詳細度）
```

`RuleMapper.set()` は詳細度で競合を解決するため、同じ詳細度レベル内での処理順序が重要です：

- **同じ詳細度**：後の `set()` 呼び出しが前のものを上書き（後勝ち）
- **高い詳細度**：順序に関係なく常に勝利
- **低い詳細度**：暗黙的にスキップ

つまり：

| シナリオ                                                    | 勝者                                                  |
| ----------------------------------------------------------- | ----------------------------------------------------- |
| `rules` vs `nodeRules`（任意のセレクタ）                    | `nodeRules`（セレクタ詳細度 `≥ [0,0,1]` > `[0,0,0]`） |
| `rules` vs `childNodeRules`（任意のセレクタ）               | `childNodeRules`（同じ理由）                          |
| `nodeRules[0]` vs `nodeRules[1]`（同じ詳細度）              | `nodeRules[1]`（配列内で後）                          |
| `nodeRules`（低い詳細度） vs `childNodeRules`（高い詳細度） | `childNodeRules`（高い詳細度が勝利）                  |
| `nodeRules`（高い詳細度） vs `childNodeRules`（低い詳細度） | `nodeRules`（高い詳細度が勝利）                       |

## 詳細度

### 詳細度とは

詳細度は CSS Selectors 仕様に基づく3要素のタプル `[a, b, c]` です：

| 要素 | カウント対象                             | 例                                                  |
| ---- | ---------------------------------------- | --------------------------------------------------- |
| `a`  | ID セレクタ                              | `#main` → `[1, 0, 0]`                               |
| `b`  | クラスセレクタ、属性セレクタ、擬似クラス | `.foo` → `[0, 1, 0]`、`[type="text"]` → `[0, 1, 0]` |
| `c`  | タイプセレクタ、擬似要素                 | `div` → `[0, 0, 1]`、`img` → `[0, 0, 1]`            |

### 詳細度の比較方法

`@markuplint/selector` の `compareSpecificity(a, b)` は辞書式比較を行います：

```typescript
function compareSpecificity(a: Specificity, b: Specificity): -1 | 0 | 1 {
  // a[0] vs b[0] を比較、次に a[1] vs b[1]、最後に a[2] vs b[2]
  // 戻り値: -1 (a < b)、0（等しい）、1 (a > b)
}
```

### `RuleMapper.set()` での詳細度の使用

```typescript
set(node, ruleName, rule: MappingLayer) {
  const currentRule = rules[ruleName];
  if (currentRule) {
    const order = compareSpecificity(currentRule.specificity, rule.specificity);
    if (order === 1) {
      return;     // 現在の方が高い詳細度 → 新しいルールをスキップ
    }
    // order === 0 または -1 → 新しいルールで上書き
  }
  rules[ruleName] = rule;
}
```

- `order === 1`（現在 > 新規）：**スキップ** — 既存の高詳細度ルールが保持される
- `order === 0`（等しい）：**上書き** — 後のマッピングが勝つ
- `order === -1`（現在 < 新規）：**上書き** — 高い詳細度のルールが勝つ

### 詳細度の例

```json
{
  "rules": {
    "class-naming": "/^prefix-/"
  },
  "nodeRules": [
    {
      "selector": "div",
      "rules": { "class-naming": "/^div-/" }
    },
    {
      "selector": "div.special",
      "rules": { "class-naming": "/^special-/" }
    },
    {
      "selector": "#main",
      "rules": { "class-naming": "/^main-/" }
    }
  ]
}
```

`<div id="main" class="special">` の場合：

| ソース         | セレクタ       | 詳細度      | `class-naming` の値 |
| -------------- | -------------- | ----------- | ------------------- |
| `rules`        | （グローバル） | `[0, 0, 0]` | `/^prefix-/`        |
| `nodeRules[0]` | `div`          | `[0, 0, 1]` | `/^div-/`           |
| `nodeRules[1]` | `div.special`  | `[0, 1, 1]` | `/^special-/`       |
| `nodeRules[2]` | `#main`        | `[1, 0, 0]` | `/^main-/`          |

処理順序：`rules` → `nodeRules[0]` → `nodeRules[1]` → `nodeRules[2]`

結果：`class-naming` = `/^main-/`（詳細度 `[1, 0, 0]` が最も高い）

## グローバルルールとのマージ

`nodeRules` や `childNodeRules` のエントリがルールを指定する場合、値は単純に置換されるのではなく、グローバルルール設定と**マージ**されます：

```typescript
const globalRule = ruleset.rules[ruleName];
const mergedRule = globalRule == null ? convertedRule : mergeRule(globalRule, convertedRule);
```

`mergeRule(a, b)`（`@markuplint/ml-config` から）は右側優先で適用されます：

| シナリオ             | 結果                                                                                             |
| -------------------- | ------------------------------------------------------------------------------------------------ |
| `b` が `false`       | ルールが無効化される（`false` を返す）                                                           |
| `b` がプリミティブ値 | `a` の値を置換                                                                                   |
| 両方がオブジェクト   | `b` のプロパティが `a` をオーバーライド。`severity`、`value`、`options`、`reason` は個別にマージ |
| `b.options` が存在   | `a.options` とマージ（オブジェクトはスプレッド、配列は連結）                                     |
| `b.value` が未設定   | `a.value` を継承                                                                                 |

### マージの例

```json
{
  "rules": {
    "my-rule": {
      "severity": "error",
      "value": "strict",
      "options": { "allow": ["a", "b"] }
    }
  },
  "nodeRules": [
    {
      "selector": "nav",
      "rules": {
        "my-rule": {
          "options": { "allow": ["c"] }
        }
      }
    }
  ]
}
```

`<nav>` の場合、`my-rule` は以下に解決されます：

```json
{
  "severity": "error",
  "value": "strict",
  "options": { "allow": ["c"] }
}
```

`severity` と `value` はグローバル設定から継承されます。`options.allow` は `nodeRules` エントリによって上書きされます（`options` レベルでのオブジェクトスプレッドであり、個別のサブプロパティレベルではありません — `options` 自体がスプレッドされます）。

## 正規表現セレクタとテンプレート変数

`nodeRules` と `childNodeRules` は正規表現セレクタをサポートし、要素の属性からデータをキャプチャできます。キャプチャされた値はルール設定で Mustache テンプレート変数として利用可能です：

```json
{
  "nodeRules": [
    {
      "regexSelector": {
        "attrName": "data-prefix",
        "attrValue": "/^(?<prefix>.+)$/"
      },
      "rules": {
        "class-naming": "/^{{ prefix }}-/"
      }
    }
  ]
}
```

`exchangeValueOnRule(rule, matches.data)` はマージ前にこれらのテンプレートをレンダリングします。

## データフロー図

```
Config
  │
  ▼
Ruleset (rules, nodeRules, childNodeRules)
  │
  ▼
_ruleMapping(ruleset)
  │
  ├─── レイヤー 1: グローバルルール
  │    └─ すべてのノード（#document を含む）に対して:
  │         ruleMapper.set(node, name, { from: 'rules', specificity: [0,0,0], rule })
  │
  ├─── レイヤー 2: ノードルール
  │    └─ 各 nodeRule エントリに対して:
  │         └─ セレクタにマッチする各 ELEMENT_NODE に対して:
  │              ├─ exchangeValueOnRule（テンプレートレンダリング）
  │              ├─ mergeRule（グローバルとマージ）
  │              └─ ruleMapper.set(node, name, { from: 'nodeRules', specificity, rule })
  │
  └─── レイヤー 3: 子ノードルール
       └─ 各 childNodeRule エントリに対して:
            └─ セレクタにマッチする各 ELEMENT_NODE に対して:
                 └─ 各子（inheritance: true の場合は子孫）に対して:
                      ├─ exchangeValueOnRule（テンプレートレンダリング）
                      ├─ mergeRule（グローバルとマージ）
                      └─ ruleMapper.set(child, name, { from: 'childNodeRules', specificity, rule })
  │
  ▼
ruleMapper.apply()
  │
  └─ マップ内の各ノードに対して:
       node.rules[ruleName] = rule
  │
  ▼
node.rules が設定される → walkOn() での検証準備完了
```
