# プロパティを設定する

## クイックリファレンス

ほとんどのプロジェクトでは、いくつかのプロパティだけで十分です。やりたいことに応じて使うプロパティを選んでください:

| やりたいこと                           | プロパティ                                                       |
| -------------------------------------- | ---------------------------------------------------------------- |
| プリセットを使う                       | [`extends`](#extends)                                            |
| ルールを有効化・カスタマイズする       | [`rules`](#rules)                                                |
| フレームワーク（React、Vueなど）で使う | [`parser`](#parser) + [`specs`](#specs)                          |
| 特定の要素にルールを適用する           | [`nodeRules`](#noderules) or [`childNodeRules`](#childnoderules) |
| カスタムコンポーネントを検証する       | [`pretenders`](#pretenders)                                      |
| ファイルをリント対象から除外する       | [`excludeFiles`](#excludefiles)                                  |
| ディレクトリごとに設定を上書きする     | [`overrides`](#overrides)                                        |

## すべてのプロパティ

```json class=config
{
  "extends": [],
  "plugins": {},
  "parser": {},
  "parserOptions": {},
  "specs": [],
  "excludeFiles": [],
  "severity": {},
  "rules": {},
  "nodeRules": [],
  "childNodeRules": [],
  "pretenders": [],
  "overrideMode": "reset",
  "overrides": {}
}
```

| プロパティ                              | 初期ガイド                                                                                                                 | インターフェイス                              |
| --------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------- |
| [**`extends`**](#extends)               | [プリセットをつかう](/docs/guides/presets)                                                                                 | [インターフェイス](#extends/interface)        |
| [**`plugins`**](#plugins)               | [カスタムルールを使う](/docs/guides/applying-rules#using-custom-rules), [カスタムルールをつくる](/docs/guides/custom-rule) | [インターフェイス](#plugins/interface)        |
| [**`parser`**](#parser)                 | [HTML以外で使う](/docs/guides/beyond-html)                                                                                 | [インターフェイス](#parser/interface)         |
| [**`parserOptions`**](#parseroptions)   | -                                                                                                                          | [インターフェイス](#parseroptions/interface)  |
| [**`specs`**](#specs)                   | [HTML以外で使う](/docs/guides/beyond-html)                                                                                 | [インターフェイス](#specs/interface)          |
| [**`excludeFiles`**](#excludefiles)     | [ファイルの除外](/docs/guides/ignoring-code#ignoring-file)                                                                 | [インターフェイス](#excludefiles/interface)   |
| [**`severity`**](#severity)             | -                                                                                                                          | [インターフェイス](#severity/interface)       |
| [**`rules`**](#rules)                   | [ルールを適用する](/docs/guides/applying-rules)                                                                            | [インターフェイス](#rules/interface)          |
| [**`nodeRules`**](#noderules)           | [部分的な適用](/docs/guides/applying-rules#applying-rules-to-specific-elements)                                            | [インターフェイス](#noderules/interface)      |
| [**`childNodeRules`**](#childnoderules) | [部分的な適用](/docs/guides/applying-rules#applying-rules-to-specific-elements)                                            | [インターフェイス](#childnoderules/interface) |
| [**`pretenders`**](#pretenders)         | [プリテンダー（偽装機能）](/docs/guides/beyond-html#pretenders)                                                            | [インターフェイス](#pretenders/interface)     |
| [**`overrideMode`**](#overridemode)     | [ルールを上書きして無効化](/docs/guides/ignoring-code#overriding-to-disable-rules)                                         | [インターフェイス](#overridemode/interface)   |
| [**`overrides`**](#overrides)           | [ルールを上書きして無効化](/docs/guides/ignoring-code#overriding-to-disable-rules)                                         | [インターフェイス](#overrides/interface)      |

## パスの解決 {#resolving-specified-paths}

<!-- textlint-disable ja-technical-writing/max-comma -->

[`extends`](#extends)、[`plugins`](#plugins)、[`parser`](#parser)、[`specs`](#specs)、[`excludeFiles`](#excludefiles)はパスを指定できます。そのうち`extends`、`plugins`、`parser`、`specs`の4つでは、パスの代わりにnpmパッケージを指定できます。

<!-- textlint-enable  ja-technical-writing/max-comma -->

まず、パッケージとしてインポートします。パッケージが存在しない、文字列がパッケージでないなど、失敗した場合は、**文字列を単なるパスとして解決します**。相対パスは、設定ファイルのあるディレクトリが基準となります。

## 各プロパティの詳細

### `extends`

他の設定ファイルへの[パス](#resolving-specified-paths)を指定した場合、その設定をマージします。

```json class=config
{
  "extends": [
    // ローカルファイルとして読み込む
    "../../.markuplintrc",
    // パッケージとして読み込む
    "third-party-config"
  ]
}
```

`markuplint:`というプレフィックスがついた名前は、Markuplintから提供された[**preset**](/docs/guides/presets)を読み込みます。

```json class=config
{
  "extends": ["markuplint:recommended"]
}
```

`plugin:`というプレフィックスがついた名前は、プラグインから提供された設定を読み込みます。スラッシュの前はプラグインがもつ名前空間です。スラッシュの後ろは、そのプラグイン固有の設定名です。

```json class=config
{
  "extends": ["plugin:third-party-plugin-name/config-name"],
  "plugins": ["third-party-plugin"]
}
```

#### インターフェイス {#extends/interface}

```ts
interface Config {
  extends?: string[];
}
```

### `plugins`

任意のプラグインを読み込むことができます。パッケージ名または[パス](#resolving-specified-paths)を指定します。プラグインが設定をもつ場合は`settings`に指定できます。

```json class=config
{
  "plugins": [
    "third-party-plugin",
    "@third-party/markuplint-plugin",
    {
      "name": "third-party-plugin2",
      "settings": {
        "foo": "bar"
      }
    },
    "./path/to/local-plugin.js",
    {
      "name": "./path/to/local-plugin.js2",
      "settings": {
        "foo": "bar"
      }
    }
  ]
}
```

#### インターフェイス {#plugins/interface}

```ts
interface Config {
  plugins?: (
    | string
    | {
        name: string;
        settings?: Record<string, string | number | boolean | Object>;
      }
  )[];
}
```

### `parser`

キーに正規表現を、値に[パーサ](/docs/guides/beyond-html#supported-syntaxes)のファイル[パス](#resolving-specified-paths)またはパッケージ名を指定します。正規表現は、対象ファイルにマッチするものを指定します（例は拡張子を示しています）。

```json class=config
{
  "parser": {
    "\\.pug$": "@markuplint/pug-parser",
    "\\.[jt]sx?$": "@markuplint/jsx-parser",
    "\\.vue$": "@markuplint/vue-parser",
    "\\.svelte$": "@markuplint/svelte-parser",
    "\\.ts$": "@markuplint/tagged-template-literal-parser",
    "\\.ext$": "./path/to/custom-parser/any-lang.js"
  }
}
```

#### インターフェイス {#parser/interface}

```ts
interface Config {
  parser?: {
    [regex: string]: string;
  };
}
```

### `parserOptions`

```json class=config
{
  "parserOptions": {
    "ignoreFrontMatter": true,
    "authoredElementName": ["AuthoredElement"]
  }
}
```

#### `ignoreFrontMatter`

`true`を設定すると、パーサはソースコードの[Front Matter](https://jekyllrb.com/docs/front-matter/)フォーマット部分を無視します。デフォルトは`false`です。

```html
---
prop: value
---

<html>
  ...
</html>
```

#### `authoredElementName`

**React**や**Vue**などを使っている場合、Markuplintのパーサーはコンポーネントに小文字の名前を付けると、ネイティブのHTML要素として検出します。ほとんどの場合、コンポーネントは大文字から命名する必要がありますが、パーサプラグインごとに特定のパターンがあります（例：Vue: [Built-in Special Elements](https://vuejs.org/api/built-in-special-elements.html)）。もし、異なる命名パターンが必要な場合は、`authoredElementName`オプションを指定することで解決できます。デフォルトは`undefined`です。

```json class=config
{
  "parserOptions": {
    "authoredElementName": ["custom", "mine"]
  }
}
```

```html
<template>
  <custom><!-- 指定がない場合はネイティブのHTML要素として検出されます。 --></custom>
  <mine><!-- 指定がない場合はネイティブのHTML要素として検出されます。 --></mine>
</template>
```

#### インターフェイス {#parseroptions/interface}

```ts
interface Config {
  parserOptions?: {
    ignoreFrontMatter?: boolean;
    authoredElementName?: string | RegExp | Function | (string | RegExp | Function)[];
  };
}
```

### `specs`

キーに正規表現を、値に[**スペック**](/docs/guides/beyond-html#supported-syntaxes)ファイルの[パス](#resolving-specified-paths)またはパッケージ名を指定します。正規表現は、対象ファイルにマッチするものを指定します（例は拡張子を示しています）。

```json class=config
{
  "specs": {
    "\\.vue$": "@markuplint/vue-spec",
    "\\.ext$": "./path/to/custom-specs/any-lang.js"
  }
}
```

#### インターフェイス {#specs/interface}

```ts
interface Config {
  specs?: {
    [regex: string]: string;
  };
}
```

<details>
<summary><code>v1.x</code>まで非推奨の構文</summary>

配列または文字列で指定可能ですが、**非推奨**です。

```json class=config
{
  // 非推奨
  "specs": ["@markuplint/vue-spec", "./path/to/custom-specs/any-lang"]
}
```

```json class=config
{
  // 非推奨
  "specs": "@markuplint/vue-spec"
}
```

</details>

### `excludeFiles`

必要であれば、ファイルを除外できます。値は**設定ファイルからの相対パスか絶対パス**が必要です。パスはglob形式も可能です。否定を表す`!`シンボルを使うこともできます。後から指定したものが優先されます。パターンは[`.gitignore`の仕様](https://git-scm.com/docs/gitignore)に従って動作します。（[node-ignore](https://github.com/kaelzhang/node-ignore)を用いて解決されます）

```json class=config
{
  "excludeFiles": ["./ignore.html", "./ignore/*.html", "!./ignore/no-ignore.html"]
}
```

#### インターフェイス {#excludefiles/interface}

```ts
interface Config {
  excludeFiles?: string[];
}
```

### `severity`

診断カテゴリごとにデフォルトの深刻度を制御します。

#### `parseError`

パースエラーの深刻度を制御します。`"off"` または `false` を設定するとパースエラーの報告を抑制できます。

```json class=config
{
  "severity": {
    "parseError": "warning"
  }
}
```

#### インターフェイス {#severity/interface}

```ts
interface Config {
  severity?: {
    parseError?: 'error' | 'warning' | 'info' | 'off' | boolean;
  };
}
```

### `rules`

[ルール](/docs/guides/applying-rules)を有効にしたり、詳細を設定します。各ルールの値は、文字列、数値、および配列のいずれかです。

`false`を指定した場合、ルールは**無効**になります。`true`を指定すると、各ルールが持つ**デフォルト値**として適用されます。

```json class=config
{
  "rules": {
    "rule-name": "value" // ここにルール名と値を設定します
  }
}
```

もしくは、**Object**で詳細を指定します。

```json class=config
{
  "rules": {
    "rule-name": {
      "value": "any-value",
      "severity": "error",
      "options": {
        "any-option": "any-optional-value"
      }
    }
  }
}
```

#### `value`

省略可能です。省略した場合は、各ルールが持つ**デフォルト値**として評価されます。

#### `severity`

`"error"`または`"warning"`を受け取ります。省略可能です。省略した場合は、各ルールが持つデフォルトの**深刻度**で評価されます。

#### `options`

ルールが定義する**Object**を受け取ります。省略可能です。フィールドの一部がデフォルト値を持つ場合があります。

<details>
<summary>非推奨の<code>option</code>フィールド</summary>

`option`フィールドは、`v3.0.0`から`options`に置き換えられました。互換性のために`option`を通しても適用できますが、**非推奨**です。代わりに`options`を使用してください。

</details>

#### ルール名について

ルール名はスラッシュを含む場合があります。その場合、そのルールがプラグインによるものであることを示します。スラッシュの前はプラグインがもつ名前空間です。スラッシュの後ろは、そのプラグイン固有の一意なルール名です。

```json class=config
{
  "plugins": ["third-party-plugin", "./path/to/local-plugin.js"],
  "rules": {
    "core-rule-name": true,
    "third-party-plugin/rule-name": true,
    "named-plugin-imported-form-local/rule-name": true
  }
}
```

#### プリセットの名前付きルール {#named-rules-from-presets}

プリセットは `namespace/rule-name` 形式の名前付きルールを定義します。名前付きルールは違反レポートに表示され、`rules` プロパティで個別にカスタマイズ可能です。

```json class=config
{
  "extends": ["markuplint:recommended"],
  "rules": {
    // プリセットの特定の名前付きルールを無効化
    "a11y/html-lang": false,

    // 名前付きルールの深刻度を変更
    "html-standard/head-charset-utf8": { "severity": "warning" },

    // ワイルドカードで名前空間内のすべての名前付きルールを無効化
    "a11y/*": false,

    // ベースルール名で無効化（詳細は下記参照）
    "no-duplicate-id": false
  }
}
```

##### ベースルール名による無効化 {#disable-by-base-rule-name}

ベースルール名を`false`に設定すると、そのベースルールをラップしている名前付きルールグループ内の該当エントリが無効化されます。例えば、プリセットが以下のように定義されているとします：

```json class=config
{
  "rules": {
    "my-checks/validation": {
      "rules": {
        "no-duplicate-id": true,
        "no-invalid-attr-value": true
      }
    }
  }
}
```

設定に`"no-duplicate-id": false`を追加すると、グループ内の該当ベースルールだけが無効化されます：

```json class=config
{
  "rules": {
    "my-checks/validation": {
      "rules": {
        "no-duplicate-id": false,
        "no-invalid-attr-value": true
      }
    }
  }
}
```

同グループ内の`no-invalid-attr-value`は影響を受けずに有効のままです。これは全グループに適用されます — `a11y/id-duplication`と`html-standard/id-duplication`の両方が`no-duplicate-id`ベースルールをラップしている場合、両方とも無効化されます。この機能は後方互換性のために提供されています。

一覧は[プリセット内の名前付きルール](/docs/guides/presets#named-rules)を参照してください。

#### 名前付きルールグループ {#named-rule-groups}

`/` を含むキーと `rules` フィールドを持つ値を使って、独自の名前付きルールグループを定義できます。1つ以上のベースルールを名前空間でラップし、個別制御やメタデータの付与が可能になります。

```json class=config
{
  "rules": {
    "my-project/no-accesskey": {
      "specConformance": "non-normative",
      "rules": {
        "no-restricted-attr": {
          "options": { "disallowAttrs": ["accesskey"] }
        }
      }
    }
  }
}
```

##### `specConformance` {#spec-conformance}

`'normative'` または `'non-normative'` を受け取ります。省略可能です。チェックがHTML仕様の規範的要件に関するものか非規範的要件に関するものかを示すメタデータで、違反レポートに含まれますが、深刻度には影響しません。

- `'normative'`: MUST や REQUIRED の要件に対応するチェック。
- `'non-normative'`: SHOULD や RECOMMENDED の要件に対応するチェック。

MarkuplintのHTML仕様に基づく組み込みプリセットルールにはこの値が自動的に設定されます。ユーザーが独自に設定することも可能です — 例えば、MarkuplintがHTML仕様の更新にまだ対応していない場合や、Markuplintのバージョンアップがやむを得ずできない場合に利用できます。

:::warning
このフィールドはHTML仕様に基づくチェックのみを対象としています。独自ルールやハウスルールに対して使用しないでください。乱用すると、違反レポートに表示される準拠レベルを見たユーザーが、HTML仕様上の要件だと誤解する恐れがあります。
:::

##### `severity`

`'error'`、`'warning'`、または `'info'` を受け取ります。省略可能です。指定すると、グループ内の全ルールのデフォルト深刻度を上書きします。

##### `rules`

[`rules`](#rules)プロパティと同じ個別ルール設定を受け取りますが、名前付きルールグループのネストは受け付けません。必須です。ラップするベースルールを1つ以上含みます。

##### 複数エントリの命名規則

名前付きルールグループに1つのエントリがある場合、グループキーがそのままルール名になります。2つ以上のエントリがある場合、各エントリに`グループキー/ベースルール名`形式の派生名が付与され、グループキーはグループ名になります。

```json class=config
{
  "rules": {
    // 単一エントリ: ルール名は "my-project/no-accesskey"
    "my-project/no-accesskey": {
      "rules": { "no-restricted-attr": { "options": { "disallowAttrs": ["accesskey"] } } }
    },
    // 複数エントリ: ルール名は "my-project/checks/no-duplicate-attr"
    // と "my-project/checks/class-naming"
    "my-project/checks": {
      "rules": {
        "no-duplicate-attr": true,
        "class-naming": "/[a-z]+/"
      }
    }
  }
}
```

グループ名を使って複数エントリのグループを一括で無効化できます：

```json class=config
{
  "rules": {
    "my-project/checks": false
  }
}
```

#### 積み上げ動作 {#accumulation}

複数の名前付きルールグループが同じベースルールをラップしている場合（例: `a11y/id-duplication` と `html-standard/id-duplication`）、それぞれ独立して実行され、両方が違反を報告します。各名前付きルールは独立して制御できます：

```json class=config
{
  "extends": ["markuplint:a11y", "markuplint:html-standard"],
  "rules": {
    // a11y の観点のみ無効化。html-standard の観点は有効のまま
    "a11y/id-duplication": false
  }
}
```

#### インターフェイス {#rules/interface}

```ts
interface Config {
  rules?: {
    [ruleName: string]: Rule<T, O> | NamedRuleGroup;
  };
}

type Rule<T, O> =
  | boolean
  | T
  | {
      severity?: 'error' | 'warning' | 'info';
      value?: T;
      option?: O;
      reason?: string;
    };

type NamedRuleGroup = {
  specConformance?: 'normative' | 'non-normative';
  severity?: 'error' | 'warning' | 'info';
  rules: {
    [ruleName: string]: Rule<T, O>;
  };
};
```

### `nodeRules`

特定の[要素にのみルールを適用](/docs/guides/applying-rules#applying-rules-to-specific-elements)させたい場合、このプロパティを指定します。値が配列であることに注意してください。

`selector`か`regexSelector`のどちらかが必要です。`rules`フィールドも必須です。個別のルール設定（[`rules`](#rules)プロパティのエントリと同じ形式）を受け取りますが、[名前付きルールグループ](#named-rule-groups)の定義（新しいグループの作成）は受け取れません。

ただし、プリセットが作成した仮想ルールをベースルール名や名前空間ワイルドカードで制御できます:

- **ベースルール名**: `"no-unknown-role": false` は仮想ルール `a11y/wai-aria/non-existent-role`（および `no-unknown-role` をラップする他のすべての仮想ルール）を無効化します
- **名前空間ワイルドカード**: `"a11y/*": false` は `a11y/` 名前空間内のすべての仮想ルールを無効化します
- **オプション上書き**: `"no-unknown-role": { "options": { ... } }` は `no-unknown-role` をラップする仮想ルールにオプションを伝播します

:::note
名前空間ワイルドカードは `false` のみ受け付けます。オプションを指定するには、具体的なルール名（ベースまたは仮想）を使用してください。
:::

```json class=config
{
  "nodeRules": [
    {
      "selector": "main",
      "rules": {
        "class-naming": "/[a-z]+(__[a-z]+)?/"
      }
    }
  ]
}
```

#### `name`

`/` を含む文字列（例: `a11y/html-lang`）を受け取ります。省略可能です。指定すると、[`rules`](#rules) プロパティで個別に設定可能な**名前付きルール**を作成します。主にプリセットで使用されます。

`rules` フィールドに1つのエントリがある場合、この名前がそのままルール名になります。2つ以上のエントリがある場合、各エントリに `name/ベースルール名` 形式の派生名が付与され、この名前はグループ名になります。グループは `rules["グループ名"]: false` で一括無効化できます。

#### `specConformance`

Named Rule Groupsの[`specConformance`](#spec-conformance)と同じです。

#### `rules` {#to-some-rules}

個別のルール設定（[`rules`](#rules)プロパティのエントリと同じ形式）を受け取りますが、[名前付きルールグループ](#named-rule-groups)の定義は受け取れません。必須です。ベースルール名と名前空間ワイルドカードに対応しています — 詳細は [nodeRules](#noderules) を参照してください。

#### `selector`

ターゲットにマッチさせるための[**セレクタ**](/docs/guides/selectors)を受け取ります。[`regexSelector`](#regexselector)を使用しない場合は必須です。

#### `regexSelector`

ターゲットにマッチさせるための**正規表現**を受け取ります。[`selector`](#selector)を使用しない場合は必須。

このフィールドには、`nodeName`、`attrName`、`attrValue`の各フィールドがあり、任意に正規表現を受け取ります。そのため、それぞれ省略が可能です。組み合わせる場合はAND条件となります。

正規表現はスラッシュで挟む必要があります。そうでない場合は、単なる文字列として適用されます。

```json class=config
{
  "nodeRules": [
    {
      "regexSelector": {
        "nodeName": "/^[a-z]+$/",
        "attrName": "/^[a-z]+$/",
        "attrValue": "/^[a-z]+$/"
      },
      "rules": {
        "any-rule": "any-value"
      }
    }
  ]
}
```

:::tip

正規表現で文字列をキャプチャし、[`rules`](#rules)プロパティの値に展開する**強力な機能**を備えています。先頭に$マークを付けたキャプチャ番号を変数として展開します。値は[Mustache](https://mustache.github.io/)形式で指定します。

```json class=config
{
  "nodeRules": [
    {
      "regexSelector": {
        "attrName": "/^data-([a-z]+)$/"
      },
      "rules": {
        "any-rule": "It is {{ $1 }} data attribute",
        "any-rule2": {
          "value": "It is {{ $1 }} data attribute",
          "severity": "error"
        }
      }
    }
  ]
}
```

もちろん、**名前付きキャプチャグループ**を使うことも可能です。名前を変数として展開します。

```json class=config
{
  "nodeRules": [
    {
      "regexSelector": {
        "attrName": "/^data-(?<dataName>[a-z]+)$/"
      },
      "rules": {
        "any-rule": "It is {{ dataName }} data attribute"
      }
    }
  ]
}
```

:::

:::caution

**名前付きキャプチャ**の使用を推奨します。番号付きキャプチャは衝突して上書きされる可能性があります。

```json class=config
{
  "nodeRules": [
    {
      "regexSelector": {
        "attrName": "/^data-([a-z]+)$/", // `$1`になります
        "attrValue": "/^(.+)$/" // ここも`$1`になり、`$1`は上書きされます
      },
      "rules": {
        "any-rule": "It is {{ $1 }} data attribute, and value is {{ $1 }}"
      }
    },
    {
      "regexSelector": {
        "attrName": "/^data-(?<dataName>[a-z]+)$/", // `dataName`になります
        "attrValue": "/^(?<dataValue>.+)$/" // `dataValue`になります
      },
      "rules": {
        "any-rule": "It is {{ dataName }} data attribute, and value is {{ dataValue }}"
      }
    }
  ]
}
```

:::

`combination`フィールドを使えば、複雑な条件でも要素を選択できます。

```json class=config
{
  "nodeRules": [
    {
      "regexSelector": {
        "attrName": "img",
        "combination": {
          "combinator": ":has(~)",
          "nodeName": "source"
        }
      }
    }
  ]
}
```

上記はCSSのセレクタ`img:has(~ source)`と同等です。

`combinator`は以下をサポートします。

<!-- textlint-disable ja-technical-writing/max-kanji-continuous-len -->

- `" "`: 子孫結合子
- `">"`: 子結合子
- `"+"`: 後方隣接兄弟結合子
- `":has(+)"`: 前方隣接兄弟結合子
- `"~"`: 後方兄弟結合子
- `":has(~)"`: 前方兄弟結合子

<!-- textlint-enable ja-technical-writing/max-kanji-continuous-len -->

ノードは無制限に深く定義できます。

```json class=config
{
  "nodeRules": [
    {
      "regexSelector": {
        "nodeName": "el1",
        "combination": {
          "combinator": " ",
          "nodeName": "el2",
          "combination": {
            "combinator": ">",
            "nodeName": "el3",
            "combination": {
              "combinator": "+",
              "nodeName": "el4",
              "combination": {
                "combinator": "~",
                "nodeName": "el5"
              }
            }
          }
        }
      }
    }
  ]
}
```

上記はCSSのセレクタ`el1 el2 > el3 + el4 ~ el5`と同等です。

#### インターフェイス {#noderules/interface}

```ts
interface Config {
  nodeRules?: (
    | {
        selector: string;
        name?: string;
        specConformance?: 'normative' | 'non-normative';
        rules: {
          [ruleName: string]: Rule<T, O>;
        };
      }
    | {
        regexSelector: RegexSelector;
        name?: string;
        specConformance?: 'normative' | 'non-normative';
        rules: {
          [ruleName: string]: Rule<T, O>;
        };
      }
  )[];
}

type RegexSelector = {
  nodeName?: string;
  attrName?: string;
  attrValue?: string;
  combination?: RegexSelector & {
    combinator: ' ' | '>' | '+' | '~' | ':has(+)' | ':has(~)';
  };
};
```

### `childNodeRules`

特定の要素の子孫に何らかのルールを適用させたい場合、このプロパティで指定します。[`inheritance`](#inheritance)フィールドに`true`を指定すると、対象要素の**すべての子孫ノードに適用**され、指定しなければ**子ノードのみに適用**されます。値が配列であることに注意してください。

:::note

このプロパティは[`inheritance`](#inheritance)フィールドを持つこと以外は、[`nodeRules`](#noderules)プロパティと同じフィールドを受け取ります。

:::

#### `inheritance`

論理値を受け取ります。省略可能で、デフォルトは`false`です。

#### インターフェイス {#childnoderules/interface}

```ts
interface Config {
  childNodeRules?: (
    | {
        selector: string;
        inheritance?: boolean;
        name?: string;
        specConformance?: 'normative' | 'non-normative';
        rules: {
          [ruleName: string]: Rule<T, O>;
        };
      }
    | {
        regexSelector: RegexSelector;
        inheritance?: boolean;
        name?: string;
        specConformance?: 'normative' | 'non-normative';
        rules: {
          [ruleName: string]: Rule<T, O>;
        };
      }
  )[];
}
```

### `pretenders`

[**プリテンダー**](/docs/guides/beyond-html#pretenders)機能は、カスタムコンポーネントをネイティブのHTML要素のように見せかける機能です。いくつかのルールで、コンポーネントをレンダリングされた結果の要素として評価するために利用します。

値はプリテンダー定義の**配列**、または`data`、`scan`などのフィールドを持つ**オブジェクト**のいずれかです。

#### `selector`

対象コンポーネントにマッチさせるための[**セレクタ**](/docs/guides/selectors)を受け取ります。必須です。

:::caution 標準 HTML 要素は対象外
セレクタが標準 HTML / SVG 要素にマッチする pretender エントリは暗黙的に無視されます。pretender は custom component（Web Components、JSX/Vue/Svelte 等の authored component、または HTML パースで spec エントリがない不明な名前）のみが対象です。`<button>` や `<marquee>` を指定しても何も起きません（[移行ガイド](/docs/migration/v4-to-v5/config#pretender-が標準-html-要素には適用されなくなった)を参照）。
:::

#### `as`

**要素名**もしくは**要素のプロパティ**を受け取ります。必須です。

```json class=config title="要素名"
{
  "pretenders": [
    {
      "selector": "MyComponent",
      "as": "div"
    }
  ]
}
```

```json class=config title="要素のプロパティ"
{
  "pretenders": [
    {
      "selector": "MyComponent",
      "as": {
        "element": "div",
        "inheritAttrs": true,
        "attrs": [
          {
            "name": "role",
            "value": "region"
          }
        ]
      }
    }
  ]
}
```

#### `as.element`

**要素名**を受け取ります。必須です。

#### `as.inheritAttrs`

レンダリングされた要素が、コンポーネントで定義された属性を公開するかどうかを論理値を受け取ります。省略可能です。省略した場合のデフォルト値は`false`です。

```jsx
const MyComponent = props => {
  return <div {...props}>{props.children}</div>;
};
```

```json class=config
{
  "pretenders": [
    {
      "selector": "MyComponent",
      "as": {
        "element": "div",
        "inheritAttrs": true
      }
    }
  ]
}
```

```jsx
<div>
  {/* レンダリングされたdiv要素がaria-live="polite"を持つものとして評価します。  */}
  <MyComponent aria-live="polite">Lorem Ipsam</MyComponent>
</div>
```

#### `as.attrs`

配列を受け取ります。レンダリングされた要素に指定した属性を持っているものとして評価されます。省略可能です。

```jsx
const MyPicture = () => {
  return <img src="path/to/file.png" alt="Lorem ipsam" />;
};
```

```json class=config
{
  "pretenders": [
    {
      "selector": "MyPicture",
      "as": {
        "element": "img",
        "attrs": [
          {
            "name": "src"
          },
          {
            "name": "alt",
            "value": "Lorem ipsam"
          }
        ]
      }
    }
  ]
}
```

```jsx
<div>
  {/* レンダリングされたimg要素がsrc属性とalt="Lorem ipsam"を持つものとして評価されます。*/}
  <MyComponent />
</div>
```

#### `as.attrs[].name`

属性名を受け取ります。必須です。

#### `as.attrs[].value`

属性値を受け取ります。省略可能です。

#### `as.aria`

ARIAのプロパティをObjectで受け取ります。現在段階では`name`フィールドしかありません。省略可能です。

#### `as.aria.name`

**アクセシブルな名前**を論理値もしくはObjectで受け取ります。コンポーネントが名前を**明確に**持っている場合は`true`を指定する。そうでなければ、その名前を参照する属性名を`fromAttr`に設定する。

```jsx
const MyIcon = ({ label }) => {
  return (
    <svg role="img" aria-label={label}>
      <rect />
    </svg>
  );
};
```

```json class=config
{
  "pretenders": [
    {
      "selector": "MyIcon",
      "as": {
        "element": "svg",
        "aria": {
          "name": {
            "fromAttr": "label"
          }
        }
      }
    }
  ]
}
```

```jsx
<div>
  {/* アクセシブルな名前が「my icon name」であるとして評価します。 */}
  <MyIcon label="my icon name" />
</div>
```

#### `as.slots` {#pretenders/as-slots}

:::caution[実験的機能]
このプロパティは**実験的**であり、将来のリリースで変更される可能性があります。
:::

コンポーネントが子要素を受け入れるか、スロットを持つかどうかを指定します。省略可能です。

- **`null`**: コンポーネントは子要素を受け入れない、またはスロットを持ちません。例えば、`<img>`（void要素）としてレンダリングされるコンポーネントです。
- **`true`**: コンポーネントは子要素を受け入れ、ラッパー要素が最も外側の要素です。
- **配列**: 複数の名前付きスロット。各スロットは要素仕様として記述されます（高度な使い方）。

```jsx
// このコンポーネントは子要素を受け入れる — slotsはtrueにすべき
const Wrapper = ({ children }) => <div>{children}</div>;

// このコンポーネントは子要素を受け入れない — slotsはnullにすべき
const Icon = props => <img src={props.src} />;
```

```json class=config
{
  "pretenders": [
    {
      "selector": "Wrapper",
      "as": {
        "element": "div",
        "slots": true
      }
    },
    {
      "selector": "Icon",
      "as": {
        "element": "img",
        "slots": null
      }
    }
  ]
}
```

#### `scan` {#pretenders/scan}

:::caution[実験的機能]
このプロパティは**実験的**であり、将来のリリースで変更される可能性があります。
:::

`pretenders`の**オブジェクト形式**を使用する場合、`scan`フィールドで**動的コンポーネントスキャン**を有効にできます。すべてのコンポーネントを手動でリストアップする代わりに、markuplintがコンポーネントファイルをスキャンしてプリテンダーマッピングを自動的に発見します。

ファイルの拡張子によってスキャナーが決定されます:

- `.js`, `.jsx`, `.ts`, `.tsx` → JSXスキャナー
- `.vue`, `.svelte`, `.astro` → テンプレートスキャナー

```json class=config
{
  "pretenders": {
    "scan": [
      {
        "files": "./src/components/**/*.tsx"
      },
      {
        "files": "./src/components/**/*.vue",
        "ignoreComponentNames": ["BaseLayout"]
      }
    ]
  }
}
```

##### `scan[].files`

スキャンするコンポーネントファイルのglobパターン（またはglobパターンの配列）。必須です。

##### `scan[].ignoreComponentNames`

スキャン結果から除外するコンポーネント名の配列。省略可能です。

#### `data`（オブジェクト形式） {#pretenders/data}

オブジェクト形式を使用する場合、インラインのプリテンダー定義は`data`フィールドに記述します:

```json class=config
{
  "pretenders": {
    "data": [
      {
        "selector": "MyComponent",
        "as": "div"
      }
    ],
    "scan": [
      {
        "files": "./src/components/**/*.vue"
      }
    ]
  }
}
```

#### `auto`（オブジェクト形式） {#pretenders/auto}

:::caution[実験的機能]
このプロパティは**実験的機能**であり、将来のリリースで変更される可能性があります。
:::

オブジェクト形式を使用する場合、`auto: true`を指定すると、`data`/`scan`をあらかじめ設定しなくても、リント対象ファイル自身のimportグラフをスキャンしてプリテンダーを解決します:

```json class=config
{
  "pretenders": {
    "auto": true
  }
}
```

設定済みのファイル集合を一度だけ事前スキャンする`scan`とは異なり、`auto`はリント対象ごとに実行され、リント対象ファイルが実際に（推移的に）importしているコンポーネントのみを対象とします。そのため、無関係なファイルにある同名コンポーネントが衝突することは構造的にありません。ただし、次のトレードオフがあります:

- ファイルシステムの監視対象は設定ファイルのみのため、watchモードやエディタセッション中に、設定を変更せずにimport先のコンポーネントファイルを変更すると、結果が古いままになることがあります。
- `auto`を指定できるのは`pretenders`の**オブジェクト形式**のみです。配列形式の省略記法では指定できません。

同じセレクターに対しては、`files`・`imports`・`data`・`scan`など他のプリテンダー解決元が先に解決されるため、`auto`よりも優先されます。

#### インターフェイス {#pretenders/interface}

```ts
interface Config {
  pretenders?:
    | Pretender[]
    | {
        data?: Pretender[];
        scan?: PretenderScanConfig[]; // @experimental
        auto?: boolean; // @experimental
      };
}

type Pretender = {
  selector: string;
  as: string | OriginalNode;
};

type OriginalNode = {
  element: string;
  slots?: null | true | Slot[]; // @experimental
  namespace?: 'svg';

  inheritAttrs?: boolean;
  attrs?: {
    name: string;
    value?:
      | string
      | {
          fromAttr: string;
        };
  }[];

  aria?: {
    name?:
      | boolean
      | {
          fromAttr: string;
        };
  };
};

type Slot = Omit<OriginalNode, 'slots'>; // @experimental

type PretenderScanConfig = {
  files: string | string[];
  ignoreComponentNames?: string[];
};
```

### `overrideMode`

このオプションは、[`overrides`](#overrides) セクションの振る舞いを制御します。このオプションを設定することで、プロジェクトの特定の部分に適用する異なるLintルールの設定の扱い方を指定できます。

#### `reset`

リセットモードでは、`overrides` セクションの設定は全く新しい設定として扱われ、既存の設定は無視されます。このモードは、特定のファイルやディレクトリに完全に新しいLintルールを適用したい場合に役立ちます。**`overrides` セクションに指定された設定のみが使用され、他の設定は適用されません。**

#### `merge`

このモードを選択すると、`overrides` セクションで指定された設定が既存の全体設定とマージされます。具体的には、`overrides` セクションに記載されたルールが追加されたり、既存のものを上書きしますが、他の設定は保持されます。このモードは、既存の設定に対して部分的な変更や追加を行いたい場合に適しています。

:::note 既定値と推奨

`overrideMode` の既定値は、互換性を保つために `reset` に設定されています。この設定は、デフォルトで `overrides` セクションが既存の設定を完全に置き換え、特定のファイルやディレクトリに特化したクリーンな状態を提供することを保証します。

既存のルールと新しいルールを融合させるより一般的な振る舞いを期待する場合は、`overrideMode` を `merge` に明示的に設定するべきです。これにより、`overrides` の設定がグローバル設定とシームレスに統合され、指定された変更のみが適用される一方で、既存のルールも維持されます。

:::

#### インターフェイス {#overridemode/interface}

```ts
interface Config {
  overrideMode?: 'reset' | 'merge';
}
```

### `overrides`

`overrides`オプションを指定すると、特定のファイルに対して設定を上書きできます。キーに指定されたglob形式のパスに適用します。([minimatch](https://www.npmjs.com/package/minimatch)を用いて解決されます)

```json class=config
{
  "rules": {
    "any-rule": true
  },
  "overrides": {
    "./path/to/**/*": {
      "rules": {
        "any-rule": false
      }
    }
  }
}
```

以下のプロパティを上書きできます。

- [`plugins`](#plugins)
- [`parser`](#parser)
- [`parserOptions`](#parseroptions)
- [`specs`](#specs)
- [`excludeFiles`](#excludefiles)
- [`rules`](#rules)
- [`nodeRules`](#noderules)
- [`childNodeRules`](#childnoderules)
- [`pretenders`](#pretenders)

#### インターフェイス {#overrides/interface}

```ts
interface Config {
  overrides?: {
    [path: string]: Omit<Config, 'extends' | 'overrideMode' | 'overrides'>;
  };
}
```
