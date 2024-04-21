# Configuring properties

The configuration has the following properties:

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

| Property                                | First guide                                                                                                                  | Interface                              |
| --------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- | -------------------------------------- |
| [**`extends`**](#extends)               | [Using Presets](/docs/guides/presets)                                                                                        | [Interface](#extends/interface)        |
| [**`plugins`**](#plugins)               | [Applying custom rules](/docs/guides/applying-rules#applying-custom-rules), [Creating custom rule](/docs/guides/custom-rule) | [Interface](#plugins/interface)        |
| [**`parser`**](#parser)                 | [Using to besides HTML](/docs/guides/besides-html)                                                                           | [Interface](#parser/interface)         |
| [**`parserOptions`**](#parseroptions)   | -                                                                                                                            | [Interface](#parseroptions/interface)  |
| [**`specs`**](#specs)                   | [Using to besides HTML](/docs/guides/besides-html)                                                                           | [Interface](#specs/interface)          |
| [**`excludeFiles`**](#excludefiles)     | [Ignoring file](/docs/guides/ignoring-code#ignoring-file)                                                                    | [Interface](#excludefiles/interface)   |
| [**`rules`**](#rules)                   | [Applying rules](/docs/guides/applying-rules)                                                                                | [Interface](#rules/interface)          |
| [**`nodeRules`**](#noderules)           | [Applying to some](/docs/guides/applying-rules#applying-to-some)                                                             | [Interface](#noderules/interface)      |
| [**`childNodeRules`**](#childnoderules) | [Applying to some](/docs/guides/applying-rules#applying-to-some)                                                             | [Interface](#childnoderules/interface) |
| [**`pretenders`**](#pretenders)         | [Pretenders](/docs/guides/besides-html#pretenders)                                                                           | [Interface](#pretenders/interface)     |
| [**`overrideMode`**](#overridemode)     | [Overriding to disable rules](/docs/guides/ignoring-code#overriding-to-disable-rules)                                        | [Interface](#overridemode/interface)   |
| [**`overrides`**](#overrides)           | [Overriding to disable rules](/docs/guides/ignoring-code#overriding-to-disable-rules)                                        | [Interface](#overrides/interface)      |

## Resolving specified paths

[`extends`](#extends),
[`plugins`](#plugins),
[`parser`](#parser),
[`specs`](#specs),
and [`excludeFiles`](#excludefiles) can specify paths.
In `extends`, `plugins`, `parser`, and `specs` , it can specify a npm package instead of a path.

First, it tries to import it as a package.
If it fails, such as the package doesn't exist, or the strings are not a package, **it resolves strings as just a path**.
If it is a relative path, the basis becomes the directory that has the configuration file.

## Details each property

### `extends`

If you specify other config file [paths](#resolving-specified-paths), it merges the current setting with them.

```json class=config
{
  "extends": [
    // load as a local file
    "../../.markuplintrc",
    // load as a package
    "third-party-config"
  ]
}
```

The name added the prefix `markuplint:` loads a [**preset**](/docs/guides/presets) provided from Markuplint.

```json class=config
{
  "extends": ["markuplint:recommended"]
}
```

The name added the prefix `plugin:` loads the config provided from any plugins.
The before the solidus is a namespace determined by the plugin.
The after the solidus is the unique config name on the plugin.

```json class=config
{
  "extends": ["plugin:third-party-plugin-name/config-name"],
  "plugins": ["third-party-plugin"]
}
```

#### Interface {#extends/interface}

```ts
interface Config {
  extends?: string[];
}
```

### `plugins`

You can load any plugins.
Specify a package name or a [path](#resolving-specified-paths).
Can specify `settings` if the plugin has it.

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

#### Interface {#plugins/interface}

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

Specify a regex to the key, and the [**parser**](/docs/guides/besides-html#supported-syntaxes) file [path](#resolving-specified-paths) or a package name to the value.
The regex should be specify it matches the target file (ex., the extension part).

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

#### Interface {#parser/interface}

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

When set `true` the parser ignores the [Front Matter](https://jekyllrb.com/docs/front-matter/) format part of the source code. Default is `false`.

```html
---
prop: value
---

<html>
  ...
</html>
```

#### `authoredElementName`

If you use **React**, **Vue**, or more, Markuplint's parser detects a component as a native HTML element if you name it with only lower-case characters.
In most cases, components should start naming upper case, but each syntax parser plugin may has a specific pattern (Ex. Vue: [Built-in Special Elements](https://vuejs.org/api/built-in-special-elements.html)).
If you need different naming patterns, You can specify the `authoredElementName` option to resolve. Default is `undefined`.

```json class=config
{
  "parserOptions": {
    "authoredElementName": ["custom", "mine"]
  }
}
```

```html
<template>
  <custom><!-- It detects as a native HTML element if not specified. --></custom>
  <mine><!-- It detects as a native HTML element if not specified. --></mine>
</template>
```

#### Interface {#parseroptions/interface}

```ts
interface Config {
  parserOptions?: {
    ignoreFrontMatter?: boolean;
    authoredElementName?: string | RegExp | Function | (string | RegExp | Function)[];
  };
}
```

### `specs`

Specify a regex to the key, and the [**spec**](/docs/guides/besides-html#supported-syntaxes) file [path](#resolving-specified-paths) or a package name to the value.
The regex should be specify it matches the target file (ex., the extension part).

```json class=config
{
  "specs": {
    "\\.vue$": "@markuplint/vue-spec",
    "\\.ext$": "./path/to/custom-specs/any-lang.js"
  }
}
```

#### Interface {#specs/interface}

```ts
interface Config {
  specs?: {
    [regex: string]: string;
  };
}
```

<details>
<summary>Deprecated syntax until <code>v1.x</code></summary>

You can specify it as Array or string, but it's **deprecated**.

```json class=config
{
  // Deprecated
  "specs": ["@markuplint/vue-spec", "./path/to/custom-specs/any-lang"]
}
```

```json class=config
{
  // Deprecated
  "specs": "@markuplint/vue-spec"
}
```

</details>

### `excludeFiles`

If necessary, files can be excluded. The value requires a **relative or absolute path** from the configuration file. Paths can also be in the glob format. You can use the `!` symbol to denote negation. Entries specified later will take precedence. The pattern operates in accordance with the [specification of `.gitignore`](https://git-scm.com/docs/gitignore). (Resolved using [node-ignore](https://github.com/kaelzhang/node-ignore)).

```json class=config
{
  "excludeFiles": ["./ignore.html", "./ignore/*.html", "!./ignore/no-ignore.html"]
}
```

#### Interface {#excludefiles/interface}

```ts
interface Config {
  excludeFiles?: string[];
}
```

### `rules`

Configure to enable or specify details to [rules](/docs/guides/applying-rules). The value for each rule is either string, number, and array.

The rule becomes **disabled** if specified as `false`. It applies as the **default value** each rule has if specified as `true`.

```json class=config
{
  "rules": {
    "rule-name": "value" // Specify the rule name and value to here
  }
}
```

Otherwise, you can specify details by **Object**:

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

It's optional. It evaluates as the **default value** each rule has if omit it.

#### `severity`

It accepts `"error"` or `"warning"`. It's optional. It applies as the **default severity** each rule has if omit it.

#### `options`

It accepts **Object** the rule defines. It's optional. There are cases in which some of its fields have a default value.

<details>
<summary>Deprecated <code>option</code> field</summary>

`option` field was replaced with `options` since `v3.0.0`. It can apply it through `option` for compatibility but using **deprecated**. Use `options` instead.

</details>

#### About the rule name

There are cases in which a rule name includes a solidus.
In that case, it indicates the rule is from a plugin.
The before the solidus is a namespace determined by the plugin.
The after the solidus is the unique rule name on the plugin.

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

#### Interface {#rules/interface}

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

If you want only any specific element to [apply some rule](/docs/guides/applying-rules#applying-to-some), you can specify by this property.
Be careful to the value is an array.

It requires either [`selector`](#selector) or [`regexSelector`](#regexselector).　And it also requires `rules` field. It specifies the same value of the [`rules`](#rules) property.

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

It accepts the same value of the [`rules`](#rules) property. It's required.

#### `selector`

It accepts [**Selector**](/docs/guides/selectors) to matche the target. It's required if no use [`regexSelector`](#regexselector).

#### `regexSelector`

It accepts a **regular expression** to matche the target. It's required if no use [`selector`](#selector).

The field has `nodeName`, `attrName`, and `attrValue` fields that accept regular expression optionally.
So each of these enables to omit. It is AND condition if combine.

The regular expression format must be nested by solidus. Otherwise, it is applied as just a string.

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

It has a **powerful feature** that captures a string through regular expressions and expands it for the value of the [`rules`](#rules) property. It expands the capturing incremental number prepended `$` mark as a variable. It should specify the value in the [Mustache](https://mustache.github.io/) format.

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

Of course, you can use the **named capture group**.
It expands the name as a variable.

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
Recommend using **named capture**.
The numbered capture may conflict and be overwritten.

```json class=config
{
  "nodeRules": [
    {
      "regexSelector": {
        "attrName": "/^data-([a-z]+)$/", // It will be `$1`.
        "attrValue": "/^(.+)$/" // It will be `$1` too. `$1` is overwritten.
      },
      "rules": {
        "any-rule": "It is {{ $1 }} data attribute, and value is {{ $1 }}"
      }
    },
    {
      "regexSelector": {
        "attrName": "/^data-(?<dataName>[a-z]+)$/", // It will be `dataName`.
        "attrValue": "/^(?<dataValue>.+)$/" // It will be `dataValue`.
      },
      "rules": {
        "any-rule": "It is {{ dataName }} data attribute, and value is {{ dataValue }}"
      }
    }
  ]
}
```

:::
You can select the element in complex conditions if you use the `combination` field.

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

The above is the same as CSS selector `img:has(~ source)`.

`combinator` field supports below:

- `" "`: Descendant combinator
- `">"`: Child combinator
- `"+"`: Next-sibling combinator
- `":has(+)"`: Prev-sibling combinator
- `"~"`: Subsequent-sibling combinator
- `":has(~)"`: Preceding-sibling combinator

You can define nodes unlimitedly deeply.

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

The above is the same as CSS selector `el1 el2 > el3 + el4 ~ el5`.

#### Interface {#noderules/interface}

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

If you want any specific element's descendants to apply some rule, you can specify by this property.
If specifies true to the [`inheritance`](#inheritance) field, **affects all descendant nodes** of the target element,
if not, **affects only child nodes**. Be careful to the value is an array.

:::note

This property accepts fields of the same as [`nodeRules`](#noderules) property except for having [`inheritance`](#inheritance) field.

:::

#### `inheritance`

It accepts boolean. It's optional and the default value is `false`.

#### Interface {#childnoderules/interface}

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

The [**Pretenders**](/docs/guides/besides-html#pretenders) feature is what a custom component pretends as a native HTML element. It helps that some rules evaluate it as an element that is the result rendered. Be careful to the value is an array.

#### `selector`

It accepts [**Selector**](/docs/guides/selectors) to matche the target component. It's required.

#### `as`

It accepts an **element name** or an **element with properties**. It's required.

```json class=config title="Element name"
{
  "pretenders": [
    {
      "selector": "MyComponent",
      "as": "div"
    }
  ]
}
```

```json class=config title="Element with properties"
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

It accepts an **element name**. It's required.

#### `as.inheritAttrs`

It accepts boolean.
Whether the rendered element should expose the attributes defined on the component.
It's optional. The default value is `false` if omit it.

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
  {/* Evaluate as rendered div element has aria-live="polite"  */}
  <MyComponent aria-live="polite">Lorem Ipsam</MyComponent>
</div>;
```

#### `as.attrs`

It accepts an array. Evaluate as rendered element has attributes specified. It's optional.

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
  {/* Evaluate as rendered img element has the src attribute and alt="Lorem ipsam"  */}
  <MyComponent />
</div>;
```

#### `as.attrs[].name`

It accepts an attribute name. It's required.

#### `as.attrs[].value`

It accepts an attribute value. It's optional.

#### `as.aria`

It accepts Object as **ARIA Properties**. It has only `name` field currently. It's optional.

#### `as.aria.name`

It accepts boolean or Object as the **accessbile name**.
Specify `true` if the component has the name **clearly**.
Otherwise, you set the attribute name that refs the name to `fromAttr`.

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
  {/* Evaluate as the accessible name is "my icon name" */}
  <MyIcon label="my icon name" />
</div>;
```

#### Interface {#pretenders/interface}

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

The option controls the behavior of the [`overrides`](#overrides) section.
By setting this option, you can specify how settings should be handled when applying different linting rules to specific parts of your project.

#### `reset`

In reset mode, the settings in the `overrides` section are treated as entirely new configurations, disregarding any existing settings. This mode is useful when you want to apply a completely new set of linting rules to specific files or directories. **Only the settings specified in the `overrides` section are used, with no application of other settings.**

#### `merge`

Selecting this mode will merge the settings specified in the `overrides` section with the existing global settings. Specifically, rules listed in the `overrides` are either added or override existing ones, while all other settings are retained. This mode is suitable when you want to make partial changes or additions to the existing configuration.

:::note Default Value and Recommendation

The default value for `overrideMode` is set to `reset` for reasons of backward compatibility. This setting ensures that by default, the overrides section completely replaces any existing configurations, providing a clean slate specific to the overridden files or directories.

If you anticipate the more common behavior of blending new rules with existing ones, you should explicitly set `overrideMode` to `merge`. This allows your overridden settings to integrate seamlessly with your global configuration, applying only the specified changes while maintaining the rest of your existing rules.

:::

#### Interface {#overridemode/interface}

```ts
interface Config {
  overrideMode?: 'reset' | 'merge';
}
```

### `overrides`

You can override configurations to specific files if you specify the `overrides` option.
It applies to **glob format paths** specified to a key. They are evaluated by [minimatch](https://www.npmjs.com/package/minimatch).

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

It can override the following properties:

- [`plugins`](#plugins)
- [`parser`](#parser)
- [`parserOptions`](#parseroptions)
- [`specs`](#specs)
- [`excludeFiles`](#excludefiles)
- [`rules`](#rules)
- [`nodeRules`](#childnoderules)
- [`childNodeRules`](#noderules)
- [`pretenders`](#pretenders)

#### Interface {#overrides/interface}

```ts
interface Config {
  overrides?: {
    [path: string]: Omit<Config, 'extends' | 'overrideMode' | 'overrides'>;
  };
}
```
