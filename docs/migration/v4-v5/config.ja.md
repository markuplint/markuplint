# Config 破壊的変更: v4 から v5 への移行ガイド

## 対象読者

- `.markuplintrc` や `markuplint.config.*` を作成する**設定ファイル作成者**
- ルールオプションから `ariaVersion` にアクセスする**カスタムルール作成者**

## 変更一覧

| 変更内容 | 影響範囲 |
|---------|---------|
| 新しい `ruleCommonSettings` 設定プロパティ | 設定ファイル |
| ARIA バージョンの解決優先度の変更 | `ariaVersion` / `version` オプションを使用するルール |
| ARIA 1.3 サポートの追加 | `ariaVersion` / `version` オプションを使用するルール |
| Named nodeRules（named rule） | 設定ファイル、プリセット作成者 |
| `invalid-attr` が4つのルールに分割、`no-restricted-attr` をラップする named rule が narrow check として動作 | `a11y/*` や rdfa プリセットで仕様検証を無効化していた設定作成者 |
| `markuplint:html-standard` が `no-unknown-attr`/`no-disallowed-attr`/`no-invalid-attr-value` をベースルールとして有効化 | `markuplint:html-standard` を単独で利用するユーザー |
| SpecConformance メタデータ | 設定ファイル、プリセット作成者 |
| Named rule の名前空間一括無効化 | named nodeRules を持つプリセットを使用する設定ファイル |
| `nodeRules`/`childNodeRules` の名前による重複排除 | `extends` で named nodeRules を使用する設定ファイル |
| ルールの配列値が連結から上書きに変更 | `extends` で配列ルール値を使用する設定ファイル |
| ルール options が deep merge から shallow merge に変更 | `extends` でネストされた options を使用する設定ファイル |
| Pretender の `data` 配列が上書きから追加に変更 | `extends` で pretenders を使用する設定ファイル |
| `--config` 指定時にデフォルト設定ファイルの自動読み込みを停止 | `--config` を指定する CLI ユーザー |

## `ruleCommonSettings`

新しいトップレベルの設定プロパティ `ruleCommonSettings` により、すべてのルールにグローバルに適用される共通オプションを設定できます。現在は `ariaVersion` をサポートしています。

### v4

各ルールに個別に `ariaVersion`（または `version`）オプションを指定する必要がありました:

```json
{
  "rules": {
    "wai-aria": {
      "options": {
        "version": "1.2"
      }
    },
    "require-accessible-name": {
      "options": {
        "ariaVersion": "1.2"
      }
    },
    "no-refer-to-non-existent-id": {
      "options": {
        "ariaVersion": "1.2"
      }
    }
  }
}
```

### v5

`ruleCommonSettings` で一度設定すれば、すべての ARIA 関連ルールがフォールバックとして使用します:

```json
{
  "ruleCommonSettings": {
    "ariaVersion": "1.2"
  },
  "rules": {
    "no-unknown-role": true,
    "require-accessible-name": true,
    "no-refer-to-non-existent-id": true
  }
}
```

> **注意:** 上の v4 の例にある `wai-aria` 傘ルールは v5 で削除されました（その21件の検査は `no-unknown-role`、`no-abstract-role` 等の独立したルールになっています）。いずれもルール単位の `version` オプションを受け付けなくなったため、これらの ARIA バージョンを設定する方法は `ruleCommonSettings.ariaVersion` のみになりました。

### 解決優先度

ルールは以下の順序で ARIA バージョンを解決します（優先度の高い順）:

1. **ルールレベルのオプション** — `options.ariaVersion`（このオプションを今も持つ `require-accessible-name`・`no-refer-to-non-existent-id` のみ）
2. **`ruleCommonSettings.ariaVersion`** — 設定ファイルからのグローバルフォールバック
3. **デフォルト** — markuplint に組み込まれた推奨 ARIA バージョン

ルール単位のオプションは引き続き優先されるため、特定のルールで `ruleCommonSettings` をオーバーライドできます:

```json
{
  "ruleCommonSettings": {
    "ariaVersion": "1.2"
  },
  "rules": {
    "require-accessible-name": {
      "options": {
        "ariaVersion": "1.3"
      }
    }
  }
}
```

## カスタムルール作成者向け

カスタムルールで ARIA バージョンにアクセスしている場合は、新しいフォールバックチェーンを使用してください:

```ts
// v4
const ariaVersion = el.rule.options.ariaVersion;

// v5
import { ARIA_RECOMMENDED_VERSION } from '@markuplint/ml-spec';

const ariaVersion =
  el.rule.options?.ariaVersion
  ?? document.ruleCommonSettings?.ariaVersion
  ?? ARIA_RECOMMENDED_VERSION;
```

`document.ruleCommonSettings` は、ルールの `verify()` コールバックに渡される `MLDocument` インスタンスで利用可能です。

## Named NodeRules

v5 では **named nodeRules** が導入されました。`name` プロパティを持つ `nodeRules` と `childNodeRules` のエントリです。Named nodeRule はベースルールから独立した **named rule** を作成し、個別に有効化・無効化・設定が可能です。

### 動作の仕組み

`nodeRules` や `childNodeRules` のエントリに `name` プロパティ（`/` を含む必要あり）がある場合、ベースルールの検証ロジックを再利用する named rule が作成されます：

```json
{
  "nodeRules": [
    {
      "name": "a11y/img-alt",
      "specConformance": "normative",
      "selector": "img",
      "rules": {
        "require-attr": { "value": "alt" }
      }
    }
  ]
}
```

これにより `require-attr` をベースにした named rule `"a11y/img-alt"` が作成されます。`require-attr` の検証ロジックを再利用しながら、`"a11y/img-alt"` という名前で違反を報告します。

### 展開の例

`ml-core` が named nodeRule を処理すると、named rule を登録し nodeRule を内部的に書き換えます。元の設定：

```jsonc
// ユーザーが書く設定
{
  "rules": {
    "require-attr": true
  },
  "nodeRules": [
    {
      "name": "a11y/img-alt",
      "specConformance": "normative",
      "selector": "img",
      "rules": {
        "require-attr": { "value": "alt" }
      }
    }
  ]
}
```

は内部的に以下と等価です：

```jsonc
// ml-core が展開後に認識する設定
{
  "rules": {
    "require-attr": true    // ベースルール — すべての要素で引き続き有効
    // + named rule "a11y/img-alt" が登録される（require-attr ベース）
  },
  "nodeRules": [
    {
      // 書き換え済み: "name" は消費され、rules キーがエイリアス名に変更
      "selector": "img",
      "rules": {
        "a11y/img-alt": { "value": "alt" }
      }
    }
  ]
}
```

これにより `require-attr` と `a11y/img-alt` は**独立した**ルールになります。`require-attr` は独自のグローバルチェックを実行し、`a11y/img-alt` は同じ検証ロジックを `img` 要素に対して `value: "alt"` で実行します。

### Named Rule の無効化

Named rule は `rules` オブジェクト内で3つのレベルで無効化できます：

```json
{
  "rules": {
    "a11y/img-alt": false,
    "a11y/*": false,
    "html-standard/figure-caption": false
  }
}
```

| パターン | 効果 |
|---------|------|
| `"a11y/img-alt": false` | 特定の named rule を無効化 |
| `"a11y/*": false` | `a11y/` 名前空間内のすべての named rule を無効化 |
| `"groupName": false` | マルチエントリグループ内のすべての named rule を無効化 |

### 複数ルールエントリ

named nodeRule の `rules` に複数の非 `false` エントリがある場合、各エントリが派生名（`name/baseRuleName`）で個別の named rule を作成します。`groupName` が割り当てられ、一括無効化が可能になります：

```json
{
  "nodeRules": [
    {
      "name": "html-standard/figure-caption",
      "selector": ":where(figcaption ~ table, table:has(~ figcaption))",
      "rules": {
        "no-restricted-element": { "value": ["caption"] },
        "require-accessible-name": false
      }
    }
  ]
}
```

ここでは `no-restricted-element`（v5で `disallowed-element` から改名）が named rule `"html-standard/figure-caption"` になります（非 false エントリが1つなのでそのまま名前を使用）。`require-accessible-name: false` はベースルールの specificity override セマンティクスを保持するため、無名 nodeRule に分離されます。

### プリセット作成者向け

ビルトインプリセット（`preset.html-standard.jsonc`、`preset.a11y.jsonc`）は named nodeRules を使用して、個別に設定可能なチェックを提供します。ユーザーはベースルールに影響を与えずに特定のプリセットチェックを無効化できます：

```json
{
  "extends": ["markuplint:recommended"],
  "rules": {
    "a11y/img-alt": false
  }
}
```

これは `a11y/img-alt` チェックのみを無効化し、他のコンテキストでの `require-attr` ベースルールは引き続き動作します。

#### `no-restricted-attr` の Named Rule における Narrow-Check セマンティクス

`invalid-attr`（v4）は一般的な HTML 仕様検証とユーザー定義の拒否リスト機構を1つのルールに束ねていました。v5 ではこれを4つの独立したルールに分割しています — `no-unknown-attr`・`no-disallowed-attr`・`no-invalid-attr-value` はどのようにラップされても常に全要素で完全な HTML 仕様検証を行いますが、`no-restricted-attr` は違います: これは純粋な **narrow check** です。`no-restricted-attr` をラップする named nodeRule および named rule group（例: `a11y/no-accesskey`、`a11y/tabindex-restrict`）は、`disallowAttrs` オプションに列挙された属性のみを報告し、仕様検証へのフォールバックはありません — `no-restricted-attr` は元々仕様と照合しないため、フォールバック先自体が存在しません。

HTML 仕様に基づく一般的な属性検証は、ベースの `no-unknown-attr`/`no-disallowed-attr`/`no-invalid-attr-value` ルールが担当します。仕様ベースの検証が必要な場合は `markuplint:html-standard`（この3つをベースルールとして有効化します）を extends するか、設定に直接追加してください。

特定の要素で `no-unknown-attr` が許可する属性を拡張したい場合（例: RDFa 属性を許可する）は、**名前無し**の nodeRule を使用してください。こうすることでオプションがベースルールに直接届きます：

```jsonc
{
  "nodeRules": [
    {
      // Unnamed: オプションがベースの `no-unknown-attr` ルールに流れる
      "selector": ":where(meta[property])",
      "rules": {
        "no-unknown-attr": {
          "options": {
            "allowAttrs": [
              { "name": "property", "value": "NoEmptyAny" },
              { "name": "content", "value": "NoEmptyAny" }
            ]
          }
        }
      }
    }
  ]
}
```

同じ位置で**名前付き**の nodeRule を使用すると独立した仮想ルールが作られ、オプションがベースルールに届かず、ベースルールが `property`/`content` を不許可として flagged してしまいます。

### Named Rule を含む設定合成の例

**プリセットが named rule を定義 → ユーザーが無効化：**

```jsonc
// プリセット
{
  "nodeRules": [
    { "name": "a11y/img-alt", "selector": "img", "rules": { "require-attr": { "value": "alt" } } }
  ]
}

// ユーザー設定
{
  "extends": ["markuplint:recommended"],
  "rules": { "a11y/img-alt": false }
}

// 結果: a11y/img-alt は無効化、ベースルール require-attr は引き続き有効
```

**プリセットが named rule を定義 → ユーザーが重大度を変更：**

```jsonc
// プリセット
{
  "nodeRules": [
    { "name": "a11y/img-alt", "selector": "img", "rules": { "require-attr": { "value": "alt" } } }
  ]
}

// ユーザー設定
{
  "extends": ["markuplint:recommended"],
  "rules": { "a11y/img-alt": { "severity": "warning" } }
}

// 結果: a11y/img-alt は error の代わりに warning として報告
```

**プリセットとユーザーが両方 named rule を定義 → 名前でマージ：**

```jsonc
// プリセット
{
  "nodeRules": [
    { "name": "a11y/img-alt", "specConformance": "normative", "selector": "img", "rules": { "require-attr": { "value": "alt" } } }
  ]
}

// ユーザー設定（同名の named nodeRule をオーバーライド）
{
  "nodeRules": [
    { "name": "a11y/img-alt", "selector": "img", "rules": { "require-attr": { "value": ["alt", "aria-label"] } } }
  ]
}

// 結果: ユーザーの a11y/img-alt がプリセット版を置き換え（名前で重複排除）
// 注意: プリセットの specConformance は保持されません。ユーザーのエントリが
// nodeRule 全体を置き換えるため、省略したプロパティも含めて上書きされます。
```

### 無効化の例

**特定の named rule を無効化：**

```jsonc
// プリセット（ベース）
{
  "rules": { "require-attr": true },
  "nodeRules": [
    { "name": "a11y/img-alt", "selector": "img", "rules": { "require-attr": { "value": "alt" } } },
    { "name": "a11y/form-label", "selector": "input", "rules": { "require-attr": { "value": "aria-label" } } }
  ]
}

// ユーザー設定（オーバーライド）
{
  "extends": ["markuplint:recommended"],
  "rules": {
    "a11y/img-alt": false
  }
}

// 最終的な効果
// - require-attr: 有効（ベースルールはすべての要素で動作）
// - a11y/img-alt: 無効化（img の alt 欠落は違反にならない）
// - a11y/form-label: 有効（input の aria-label 欠落は引き続き報告）
```

**名前空間全体を無効化：**

```jsonc
// ユーザー設定
{
  "extends": ["markuplint:recommended"],
  "rules": {
    "a11y/*": false
  }
}

// 最終的な効果
// - require-attr: 有効（ベースルールは影響を受けない）
// - a11y/img-alt: 無効化
// - a11y/form-label: 無効化
// - html-standard/figure-caption: 有効（異なる名前空間）
```

## SpecConformance

`specConformance` は named nodeRules でのみ使用可能な**プリセットレベルのアノテーション**です。RFC 2119 キーワードの強度に基づいて、チェックの仕様準拠レベルを分類します：

| `specConformance` | 意味 | RFC 2119 キーワード |
|-------------------|------|---------------------|
| `'normative'` | 厳格な要件 | MUST, SHALL, REQUIRED |
| `'non-normative'` | 推奨事項 | SHOULD, MAY, RECOMMENDED |
| (未設定) | 仕様分類なし | — |

`specConformance` は違反の**メタデータ**として下流ツールやレポートに含まれます。違反の重大度を自動的に変更する機能は**ありません**。重大度を制御するには、ルール設定の `severity` フィールドを直接使用してください。

```json
{
  "nodeRules": [
    {
      "name": "html-standard/figure-caption",
      "specConformance": "normative",
      "selector": "...",
      "rules": { "no-restricted-element": { "value": ["caption"] } }
    }
  ]
}
```

`permitted-contents` のような組み込みルールは `defaultSeverity` で既に正しい重大度が設定されているため、`specConformance` は不要です。プロジェクト規約のためのユーザー定義 nodeRules には `specConformance` を使用せず、ルール設定の `severity` フィールドで直接重大度を指定してください。

> **注意:** `specConformance` は主にプリセット作成者を対象としていますが、
> スキーマ上は制限されていません。markuplint が最新の HTML 仕様変更にまだ
> 追いついていない場合や、markuplint のバージョンアップが困難な場合など、
> ユーザーが自身の named nodeRules に `specConformance` を設定することも可能です。

### Violation における Named Rule の表示

Named nodeRule が違反を検出した場合、2つのルール識別子が利用可能です：

| フィールド | 値 | 用途 |
|-----------|------|------|
| `ruleId` | ベースルール名 | 常に存在。基になるルールを識別します（例: `require-attr`）。プログラム的なフィルタリングに使用。 |
| `name` | Named rule のエイリアス | Named nodeRules の場合のみ存在（例: `a11y/html-lang`）。表示名として利用可能な場合はこちらを使用。 |

**表示ガイドライン**: 表示名には `violation.name ?? violation.ruleId` を使用してください。
CLI レポーターはこの規約に従い、named rule ではベースルール名の代わりにエイリアス名を表示します。

カスタムツール作成者向け：

```ts
const displayName = violation.name ?? violation.ruleId;
```

## NodeRules のマージ動作の変更

v5 では `extends` 使用時の `nodeRules` と `childNodeRules` のマージ方法が変更されました。

**v4:** 両配列は単純に連結されていました。

**v5:** 名前付きエントリ（`name` プロパティを持つもの）はマージ時に名前で重複排除されます。オーバーライド設定のエントリが、同じ名前のベース設定のエントリを置き換えます。無名エントリは従来通り追加されます。

### マージの例

**名前付きエントリのオーバーライド（名前による重複排除）：**

```jsonc
// プリセット（ベース設定）
{
  "nodeRules": [
    {
      "name": "a11y/img-alt",
      "specConformance": "normative",
      "selector": "img",
      "rules": { "require-attr": { "value": "alt" } }
    },
    {
      "selector": "div.legacy",
      "rules": { "class-naming": "^legacy-" }
    }
  ]
}

// ユーザー設定（オーバーライド）
{
  "nodeRules": [
    {
      "name": "a11y/img-alt",
      "specConformance": "non-normative",
      "selector": "img",
      "rules": { "require-attr": { "value": "alt" } }
    },
    {
      "selector": "span.icon",
      "rules": { "no-unknown-role": true }
    }
  ]
}

// マージ結果（mergeConfig の出力）
{
  "nodeRules": [
    // "a11y/img-alt": ユーザー版がプリセット版を置き換え（同名 → 重複排除）
    {
      "name": "a11y/img-alt",
      "specConformance": "non-normative",
      "selector": "img",
      "rules": { "require-attr": { "value": "alt" } }
    },
    // プリセットの無名エントリ: そのまま保持
    {
      "selector": "div.legacy",
      "rules": { "class-naming": "^legacy-" }
    },
    // ユーザーの無名エントリ: 追加
    {
      "selector": "span.icon",
      "rules": { "no-unknown-role": true }
    }
  ]
}
```

**無名エントリは常に追加されます：**

```jsonc
// ベース: [{ selector: "img", rules: {...} }]
// オーバーライド: [{ selector: "img", rules: {...} }]
// 結果: 両方のエントリが保持される（name なし → 重複排除なし）
```

## マージ動作の変更

v5 ではマージアルゴリズムが変更されました。これらの変更は `extends` を使用して設定を結合する際に影響します。

### ルールの配列値: 連結から上書きに変更

**v4:** 2つの設定をマージする際、配列のルール値は連結されていました。

```json
// ベース設定
{ "rules": { "allowed-tags": ["div", "span"] } }
// オーバーライド設定
{ "rules": { "allowed-tags": ["section", "article"] } }
// v4 の結果: ["div", "span", "section", "article"]
```

**v5:** 配列のルール値は上書きされます（右辺優先）。ESLint や Biome と一貫した動作です。

```json
// v5 の結果: ["section", "article"]
```

**移行方法:** 配列の連結に依存していた場合は、単一の設定内で手動で値を統合してください:

```json
{ "rules": { "allowed-tags": ["div", "span", "section", "article"] } }
```

### ルール options: Deep Merge から Shallow Merge に変更

**v4:** ルール options は `deepmerge` ライブラリを使用して deep merge されていました。

```json
// ベース設定
{ "rules": { "my-rule": { "options": { "nested": { "a": 1, "b": 2 } } } } }
// オーバーライド設定
{ "rules": { "my-rule": { "options": { "nested": { "b": 3 } } } } }
// v4 の結果 options: { "nested": { "a": 1, "b": 3 } }
```

**v5:** ルール options は shallow merge（`{...a, ...b}`）を使用します。ネストされたオブジェクトは完全に置き換えられます。

```json
// v5 の結果 options: { "nested": { "b": 3 } }
```

**移行方法:** ネストされたオプションオブジェクトの deep merge に依存していた場合は、オーバーライド側で完全なオブジェクトを指定してください:

```json
{ "rules": { "my-rule": { "options": { "nested": { "a": 1, "b": 3 } } } } }
```

### Pretender `data` 配列: 上書きから追加に変更

**v4:** Pretender の `data` 配列は上書きされていました（右辺優先）。

**v5:** Pretender の `data` 配列は追加（連結）されるようになりました。`files` と `imports` は引き続き上書きされます。

| プロパティ | v4 の動作 | v5 の動作 |
| ---------- | --------- | --------- |
| `files`    | 上書き    | 上書き    |
| `imports`  | 上書き    | 上書き    |
| `data`     | 上書き    | 追加      |

**移行方法:** これは一般的に非破壊的な改善です。pretender データを完全に置き換える必要がある場合は、`extends` を使用せず、単一の設定ですべての pretenders を定義してください。

## `--config` 指定時のデフォルト設定ファイル自動読み込みの停止

v4 では、CLI の `--config` オプションで設定ファイルを指定しても、デフォルトの設定ファイル（`.markuplintrc` など）が自動検索・読み込みされ、マージされていました。v5 では、`--config` を指定するとデフォルト設定ファイルの検索がスキップされ、指定したファイルのみが使用されます。

**v4:** 両方の設定が読み込まれてマージされる。

```bash
# custom.json と .markuplintrc の両方が読み込まれてマージされる
markuplint --config custom.json index.html
```

**v5:** 指定した設定のみが読み込まれる。

```bash
# custom.json のみ読み込まれ、.markuplintrc は無視される
markuplint --config custom.json index.html
```

**移行方法:** `--config` で指定したファイルとプロジェクトの `.markuplintrc` のマージに依存していた場合、設定ファイルの `extends` を使用してください:

```json
{
  "extends": ["./.markuplintrc"],
  "rules": {
    "your-custom-rule": true
  }
}
```

CLI フラグの変更の詳細は [CLI 移行ガイド](./cli.ja.md)を参照してください。

## ARIA 1.3 サポート

v5 では `ariaVersion` の有効な値として `"1.3"` が追加されました。デフォルトは `"1.2"` のままなので、既存の設定への影響はありません。ARIA 1.3 では `generic` ロールの透過性や `image`/`img` ロールの同義語など、重要な動作変更が導入されています。詳細は [ARIA 移行ガイド](./aria.ja.md)を参照してください。
