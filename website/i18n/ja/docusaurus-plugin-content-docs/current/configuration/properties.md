# プロパティを設定する

設定は、以下のプロパティを持ちます。

```json class=config
{
  "extends": [],
  "plugins": {},
  "parser": {},
  "parserOptions": {},
  "specs": [],
  "excludeFiles": [],
  "rules": {},
  "nodeRules": [],
  "childNodeRules": [],
  "pretenders": [],
  "overrideMode": "reset",
  "overrides": {}
}
```

| プロパティ                              | 初期ガイド                                                                                                                    | インターフェイス                              |
| --------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------- |
| [**`extends`**](#extends)               | [プリセットをつかう](/docs/guides/presets)                                                                                    | [インターフェイス](#extends/interface)        |
| [**`plugins`**](#plugins)               | [カスタムルールの適用](/docs/guides/applying-rules#applying-custom-rules), [カスタムルールをつくる](/docs/guides/custom-rule) | [インターフェイス](#plugins/interface)        |
| [**`parser`**](#parser)                 | [HTML以外につかう](/docs/guides/besides-html)                                                                                 | [インターフェイス](#parser/interface)         |
| [**`parserOptions`**](#parseroptions)   | -                                                                                                                             | [インターフェイス](#parseroptions/interface)  |
| [**`specs`**](#specs)                   | [HTML以外につかう](/docs/guides/besides-html)                                                                                 | [インターフェイス](#specs/interface)          |
| [**`excludeFiles`**](#excludefiles)     | [ファイルの除外](/docs/guides/ignoring-code#ignoring-file)                                                                    | [インターフェイス](#excludefiles/interface)   |
| [**`rules`**](#rules)                   | [ルールを適用する](/docs/guides/applying-rules)                                                                               | [インターフェイス](#rules/interface)          |
| [**`nodeRules`**](#noderules)           | [部分的な適用](/docs/guides/applying-rules#applying-to-some)                                                                  | [インターフェイス](#noderules/interface)      |
| [**`childNodeRules`**](#childnoderules) | [部分的な適用](/docs/guides/applying-rules#applying-to-some)                                                                  | [インターフェイス](#childnoderules/interface) |
| [**`pretenders`**](#pretenders)         | [プリテンダー（偽装機能）](/docs/guides/besides-html#pretenders)                                                              | [インターフェイス](#pretenders/interface)     |
| [**`overrideMode`**](#overridemode)     | [ルールを上書きして無効化](/docs/guides/ignoring-code#overriding-to-disable-rules)                                            | [インターフェイス](#overridemode/interface)   |
| [**`overrides`**](#overrides)           | [ルールを上書きして無効化](/docs/guides/ignoring-code#overriding-to-disable-rules)                                            | [インターフェイス](#overrides/interface)      |

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

キーに正規表現を、値に[パーサ](/docs/guides/besides-html#supported-syntaxes)のファイル[パス](#resolving-specified-paths)またはパッケージ名を指定します。正規表現は、対象ファイルにマッチするものを指定します（例は拡張子を示しています）。

```json class=config
{
  "parser": {
    "\\.pug$": "@markuplint/pug-parser",
    "\\.[jt]sx?$": "@markuplint/jsx-parser",
    "\\.vue$": "@markuplint/vue-parser",
    "\\.svelte$": "@markuplint/svelte-parser",
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

キーに正規表現を、値に[**スペック**](/docs/guides/besides-html#supported-syntaxes)ファイルの[パス](#resolving-specified-paths)またはパッケージ名を指定します。正規表現は、対象ファイルにマッチするものを指定します（例は拡張子を示しています）。

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

#### インターフェイス {#rules/interface}

```ts
interface Config {
  rules?: {
    [ruleName: string]: Rule<T, O>;
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
```

### `nodeRules`

特定の[要素にのみルールを適用](/docs/guides/applying-rules#applying-to-some)させたい場合、このプロパティを指定します。値が配列であることに注意してください。

`selector`か`regexSelector`のどちらかが必要です。`rules`フィールドも必須です。[`rules`](#rules)プロパティと同じ値を指定します。

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

#### `rules` {#to-some-rules}

[`rules`](#rules)プロパティと同じ値を受け取ります。必須です。

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
        rules: {
          [ruleName: string]: Rule<T, O>;
        };
      }
    | {
        regexSelector: RegexSelector;
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
        rules: {
          [ruleName: string]: Rule<T, O>;
        };
      }
    | {
        regexSelector: RegexSelector;
        inheritance?: boolean;
        rules: {
          [ruleName: string]: Rule<T, O>;
        };
      }
  )[];
}
```

### `pretenders`

[**プリテンダー**](/docs/guides/besides-html#pretenders)機能は、カスタムコンポーネントをネイティブのHTML要素のように見せかける機能です。いくつかのルールで、コンポーネントをレンダリングされた結果の要素として評価するために利用します。値が配列であることに注意してください。

#### `selector`

対象コンポーネントにマッチさせるための[**セレクタ**](/docs/guides/selectors)を受け取ります。必須です。

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
</div>;
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
</div>;
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
</div>;
```

#### インターフェイス {#pretenders/interface}

```ts
interface Config {
  pretenders?: {
    selector: string;
    as: string | OriginalNode;
  }[];
}

type OriginalNode = {
  element: string;
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
- [`nodeRules`](#childnoderules)
- [`childNodeRules`](#noderules)
- [`pretenders`](#pretenders)

#### インターフェイス {#overrides/interface}

```ts
interface Config {
  overrides?: {
    [path: string]: Omit<Config, 'extends' | 'overrideMode' | 'overrides'>;
  };
}
```
