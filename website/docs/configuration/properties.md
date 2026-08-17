# Configuring properties

## Quick reference

Most projects only need a few properties. Here's what to use based on what you want to do:

| I want to...                       | Property                                                         |
| ---------------------------------- | ---------------------------------------------------------------- |
| Use a preset                       | [`extends`](#extends)                                            |
| Enable or customize a rule         | [`rules`](#rules)                                                |
| Use a framework (React, Vue, etc.) | [`parser`](#parser) + [`specs`](#specs)                          |
| Apply rules to specific elements   | [`nodeRules`](#noderules) or [`childNodeRules`](#childnoderules) |
| Validate custom components         | [`pretenders`](#pretenders)                                      |
| Exclude files from linting         | [`excludeFiles`](#excludefiles)                                  |
| Override settings per directory    | [`overrides`](#overrides)                                        |

## All properties

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

| Property                                | First guide                                                                                                             | Interface                              |
| --------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- | -------------------------------------- |
| [**`extends`**](#extends)               | [Using Presets](/docs/guides/presets)                                                                                   | [Interface](#extends/interface)        |
| [**`plugins`**](#plugins)               | [Using custom rules](/docs/guides/applying-rules#using-custom-rules), [Creating Custom Rules](/docs/guides/custom-rule) | [Interface](#plugins/interface)        |
| [**`parser`**](#parser)                 | [Beyond HTML](/docs/guides/beyond-html)                                                                                 | [Interface](#parser/interface)         |
| [**`parserOptions`**](#parseroptions)   | -                                                                                                                       | [Interface](#parseroptions/interface)  |
| [**`specs`**](#specs)                   | [Beyond HTML](/docs/guides/beyond-html)                                                                                 | [Interface](#specs/interface)          |
| [**`excludeFiles`**](#excludefiles)     | [Ignoring file](/docs/guides/ignoring-code#ignoring-file)                                                               | [Interface](#excludefiles/interface)   |
| [**`severity`**](#severity)             | -                                                                                                                       | [Interface](#severity/interface)       |
| [**`rules`**](#rules)                   | [Applying Rules](/docs/guides/applying-rules)                                                                           | [Interface](#rules/interface)          |
| [**`nodeRules`**](#noderules)           | [Applying rules to specific elements](/docs/guides/applying-rules#applying-rules-to-specific-elements)                  | [Interface](#noderules/interface)      |
| [**`childNodeRules`**](#childnoderules) | [Applying rules to specific elements](/docs/guides/applying-rules#applying-rules-to-specific-elements)                  | [Interface](#childnoderules/interface) |
| [**`pretenders`**](#pretenders)         | [Pretenders](/docs/guides/beyond-html#pretenders)                                                                       | [Interface](#pretenders/interface)     |
| [**`overrideMode`**](#overridemode)     | [Overriding to disable rules](/docs/guides/ignoring-code#overriding-to-disable-rules)                                   | [Interface](#overridemode/interface)   |
| [**`overrides`**](#overrides)           | [Overriding to disable rules](/docs/guides/ignoring-code#overriding-to-disable-rules)                                   | [Interface](#overrides/interface)      |

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

> **When to use:** Almost always. This is how you apply [presets](/docs/guides/presets) or share configuration across projects.

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

> **When to use:** When using [custom rules](/docs/guides/custom-rule) or third-party plugins.

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

> **When to use:** When linting files that are not plain HTML (JSX, Vue, Svelte, Pug, etc.). See [Beyond HTML](/docs/guides/beyond-html).

Specify a regex to the key, and the [**parser**](/docs/guides/beyond-html#supported-syntaxes) file [path](#resolving-specified-paths) or a package name to the value.
The regex should be specify it matches the target file (ex., the extension part).

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

#### Interface {#parser/interface}

```ts
interface Config {
  parser?: {
    [regex: string]: string;
  };
}
```

### `parserOptions`

> **When to use:** Rarely. Only needed to configure parser-specific options like `authoredElementsOnly` for Svelte.

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

> **When to use:** When using a framework that has its own attributes (React, Vue, Svelte, etc.). Usually paired with `parser`.

Specify a regex to the key, and the [**spec**](/docs/guides/beyond-html#supported-syntaxes) file [path](#resolving-specified-paths) or a package name to the value.
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

> **When to use:** When you want to skip linting specific files or directories (e.g., generated files, third-party code).

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

### `severity`

> **When to use:** When you want to change the default severity of parse errors or other diagnostic categories.

Controls default severity levels for specific categories of diagnostics.

#### `parseError`

Controls the severity of parse errors. Set to `"off"` or `false` to suppress parse error reporting.

```json class=config
{
  "severity": {
    "parseError": "warning"
  }
}
```

#### Interface {#severity/interface}

```ts
interface Config {
  severity?: {
    parseError?: 'error' | 'warning' | 'info' | 'off' | boolean;
  };
}
```

### `rules`

> **When to use:** When you want to enable, disable, or customize individual [rules](/docs/guides/applying-rules) beyond what presets provide.

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

#### Named rules from presets {#named-rules-from-presets}

Presets define named rules using the `namespace/rule-name` format. These named rules appear in violation reports and can be customized individually through the `rules` property.

```json class=config
{
  "extends": ["markuplint:recommended"],
  "rules": {
    // Disable a specific named rule from a preset
    "a11y/html-lang": false,

    // Change severity of a named rule
    "html-standard/head-charset-utf8": { "severity": "warning" },

    // Disable all named rules in a namespace using wildcard
    "a11y/*": false,

    // Disable by base rule name (see explanation below)
    "id-duplication": false
  }
}
```

##### Disabling by base rule name {#disable-by-base-rule-name}

Setting a base rule name to `false` disables it inside every named rule group that wraps it. For example, suppose a preset defines:

```json class=config
{
  "rules": {
    "my-checks/validation": {
      "rules": {
        "id-duplication": true,
        "invalid-attr": true
      }
    }
  }
}
```

Adding `"id-duplication": false` to your config is equivalent to reaching into the group and disabling that specific base rule:

```json class=config
{
  "rules": {
    "my-checks/validation": {
      "rules": {
        "id-duplication": false,
        "invalid-attr": true
      }
    }
  }
}
```

The `invalid-attr` rule in the same group remains active. This applies across all groups — if both `a11y/id-duplication` and `html-standard/id-duplication` wrap the `id-duplication` base rule, both are disabled. This is provided for backward compatibility.

See [Named rules in presets](/docs/guides/presets#named-rules) for the full list.

#### Named rule groups {#named-rule-groups}

You can define your own named rule groups by using a key that contains `/` and a value with a `rules` field. This wraps one or more base rules under a namespace, allowing per-check control and metadata.

```json class=config
{
  "rules": {
    "my-project/no-accesskey": {
      "specConformance": "non-normative",
      "rules": {
        "invalid-attr": {
          "options": { "disallowAttrs": ["accesskey"] }
        }
      }
    }
  }
}
```

##### `specConformance` {#spec-conformance}

It accepts `'normative'` or `'non-normative'`. It's optional. This metadata indicates whether the check relates to a normative or non-normative requirement of the HTML specification, and is included in violation reports but does not affect severity.

- `'normative'`: The check corresponds to a MUST or REQUIRED requirement.
- `'non-normative'`: The check corresponds to a SHOULD or RECOMMENDED requirement.

Markuplint's built-in presets set this value automatically for rules derived from the HTML specification. Users may also set it in their own configuration — for example, when Markuplint has not yet caught up with an HTML specification update, or when upgrading Markuplint is not feasible.

:::warning
This field is intended exclusively for checks derived from the HTML specification. Do not use it for custom rules or house rules. Misuse can confuse users who see the conformance level in violation reports, as they may mistakenly believe the issue is required by the HTML specification.
:::

##### `severity`

It accepts `'error'`, `'warning'`, or `'info'`. It's optional. When specified, this overrides the default severity for all rules in the group.

##### `rules`

It accepts base rule entries (the same individual rule settings as the [`rules`](#rules) property), but does not accept nested named rule groups. It's required. Contains one or more base rules to wrap.

##### Multi-entry naming

When a named rule group contains a single entry, the group key is used directly as the rule name. When it contains two or more entries, each entry gets a derived name in the format `groupKey/baseRuleName`, and the group key becomes the group name.

```json class=config
{
  "rules": {
    // Single entry: rule name is "my-project/no-accesskey"
    "my-project/no-accesskey": {
      "rules": { "invalid-attr": { "options": { "disallowAttrs": ["accesskey"] } } }
    },
    // Multi entry: rule names are "my-project/checks/attr-duplication"
    // and "my-project/checks/class-naming"
    "my-project/checks": {
      "rules": {
        "attr-duplication": true,
        "class-naming": "/[a-z]+/"
      }
    }
  }
}
```

You can disable the entire multi-entry group at once using the group name:

```json class=config
{
  "rules": {
    "my-project/checks": false
  }
}
```

#### Accumulation behavior {#accumulation}

When multiple named rule groups wrap the same base rule (e.g., `a11y/id-duplication` and `html-standard/id-duplication`), they run independently and both report violations. Each named rule can be independently controlled:

```json class=config
{
  "extends": ["markuplint:a11y", "markuplint:html-standard"],
  "rules": {
    // Disable only the a11y perspective; html-standard perspective remains active
    "a11y/id-duplication": false
  }
}
```

#### Interface {#rules/interface}

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
      reasonOnly?: boolean;
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

> **When to use:** When you want different rules for specific elements (e.g., stricter rules for `<main>`, relaxed rules for legacy components).

If you want only any specific element to [apply some rule](/docs/guides/applying-rules#applying-rules-to-specific-elements), you can specify by this property.
Be careful to the value is an array.

It requires either [`selector`](#selector) or [`regexSelector`](#regexselector).　And it also requires `rules` field. It accepts individual rule settings (the same as entries in the [`rules`](#rules) property), but does not accept [Named Rule Group](#named-rule-groups) definitions (you cannot define new groups here).

However, you can reference named rules by their base rule name or use namespace wildcards to control virtual rules created by presets:

- **Base rule name**: `"wai-aria": false` disables the virtual rule `a11y/wai-aria` (and any other virtual rule wrapping `wai-aria`)
- **Namespace wildcard**: `"a11y/*": false` disables all virtual rules in the `a11y/` namespace
- **Option override**: `"wai-aria": { "options": { ... } }` propagates options to virtual rules wrapping `wai-aria`

:::note
Namespace wildcards only accept `false`. To set options, use a specific rule name (base or virtual).
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

It accepts a `string` that contains a `/` (e.g., `a11y/html-lang`). It's optional. When specified, this creates a **named rule** that can be individually configured via the [`rules`](#rules) property. This is primarily used by presets.

When the `rules` field contains a single entry, this name is used directly as the rule name. When it contains two or more entries, each entry gets a derived name in the format `name/baseRuleName`, and this name becomes the group name. The group can be disabled at once via `rules["groupName"]: false`.

#### `specConformance`

Same as [`specConformance`](#spec-conformance) in Named Rule Groups.

#### `rules` {#to-some-rules}

It accepts individual rule settings (the same as entries in the [`rules`](#rules) property), but does not accept [Named Rule Group](#named-rule-groups) definitions. It's required. Base rule names and namespace wildcards are supported — see [nodeRules](#noderules) for details.

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

> **When to use:** When you want rules to apply to all children (or descendants) of a matched element — e.g., disabling rules inside a legacy section.

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

> **When to use:** When using frameworks with custom components (React, Vue, Svelte) and you want Markuplint to validate them as native HTML elements.

The [**Pretenders**](/docs/guides/beyond-html#pretenders) feature is what a custom component pretends as a native HTML element. It helps that some rules evaluate it as an element that is the result rendered.

The value can be either an **array** of pretender definitions or an **object** with `data`, `scan`, and other fields.

#### `selector`

It accepts [**Selector**](/docs/guides/selectors) to matche the target component. It's required.

:::caution Standard HTML elements are excluded
A pretender entry whose selector resolves to a standard HTML or SVG element is silently ignored. Pretenders apply only to custom components — web components, JSX/Vue/Svelte authored components, or unknown HTML-parsed names with no spec entry. Targeting `<button>`, `<marquee>`, etc. is a no-op (see [migration notes](/docs/migration/v4-to-v5/config#pretenders-no-longer-apply-to-standard-html-tags)).
:::

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
</div>
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
</div>
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
</div>
```

#### `as.slots` {#pretenders/as-slots}

:::caution[Experimental]
This property is **experimental** and may change in future releases.
:::

It specifies whether the component accepts children or has slots. It's optional.

- **`null`**: The component does **not** accept children or does not have slots. For example, a component that renders as `<img>` (a void element).
- **`true`**: The component accepts children, and the wrapper element is the outermost element.
- **Array**: Multiple named slots, each described as an element specification (advanced usage).

```jsx
// This component accepts children — slots should be true
const Wrapper = ({ children }) => <div>{children}</div>;

// This component does not accept children — slots should be null
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

:::caution[Experimental]
This property is **experimental** and may change in future releases.
:::

When using the **object form** of `pretenders`, the `scan` field enables **dynamic component scanning**. Instead of manually listing every component, markuplint scans your component files and automatically discovers pretender mappings.

File extensions determine the scanner:

- `.js`, `.jsx`, `.ts`, `.tsx` → JSX scanner
- `.vue`, `.svelte`, `.astro` → template scanner

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

A glob pattern (or an array of glob patterns) for component files to scan. It's required.

##### `scan[].ignoreComponentNames`

An array of component names to exclude from scanning results. It's optional.

#### `data` (object form) {#pretenders/data}

When using the object form, inline pretender definitions go in the `data` field:

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

#### `auto` (object form) {#pretenders/auto}

:::caution[Experimental]
This property is **experimental** and may change in future releases.
:::

When using the object form, `auto: true` resolves pretenders by scanning the file being linted's own import graph, instead of requiring `data`/`scan` to be configured up front:

```json class=config
{
  "pretenders": {
    "auto": true
  }
}
```

Unlike `scan`, which pre-scans a configured set of files once, `auto` runs per lint target and only ever considers components the linted file actually imports (transitively) — so same-named components in unrelated files can never collide. This comes with two trade-offs:

- Only the config file is filesystem-watched, so in watch mode or an editor session, results can go stale if an imported component file changes without the config changing too.
- Only the **object form** of `pretenders` can express `auto`; the array shorthand cannot.

Other pretender sources (`files`, `imports`, `data`, `scan`) take precedence over `auto` for the same selector, since they're resolved first.

#### Interface {#pretenders/interface}

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

> **When to use:** When using `overrides` and you want to control whether overridden settings replace or merge with the base configuration.

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

> **When to use:** When different directories or file patterns need different rules (e.g., relaxed rules for a legacy directory).

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
- [`nodeRules`](#noderules)
- [`childNodeRules`](#childnoderules)
- [`pretenders`](#pretenders)

#### Interface {#overrides/interface}

```ts
interface Config {
  overrides?: {
    [path: string]: Omit<Config, 'extends' | 'overrideMode' | 'overrides'>;
  };
}
```
