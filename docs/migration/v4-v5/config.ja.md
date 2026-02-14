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
    "wai-aria": true,
    "require-accessible-name": true,
    "no-refer-to-non-existent-id": true
  }
}
```

### 解決優先度

ルールは以下の順序で ARIA バージョンを解決します（優先度の高い順）:

1. **ルールレベルのオプション** — `options.version`（wai-aria）または `options.ariaVersion`（その他のルール）
2. **`ruleCommonSettings.ariaVersion`** — 設定ファイルからのグローバルフォールバック
3. **デフォルト** — markuplint に組み込まれた推奨 ARIA バージョン

ルール単位のオプションは引き続き優先されるため、特定のルールで `ruleCommonSettings` をオーバーライドできます:

```json
{
  "ruleCommonSettings": {
    "ariaVersion": "1.2"
  },
  "rules": {
    "wai-aria": {
      "options": {
        "version": "1.3"
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
