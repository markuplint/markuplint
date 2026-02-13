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

## ARIA 1.3 サポート

v5 では `ariaVersion` の有効な値として `"1.3"` が追加されました。デフォルトは `"1.2"` のままなので、既存の設定への影響はありません。ARIA 1.3 では `generic` ロールの透過性や `image`/`img` ロールの同義語など、重要な動作変更が導入されています。詳細は [ARIA 移行ガイド](./aria.ja.md)を参照してください。
