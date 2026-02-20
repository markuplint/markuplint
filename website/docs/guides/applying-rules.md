# Applying rules

## Default behavior

Markuplint searches a [configuration file](/docs/configuration) automatically when evaluating. It applies rules that included by [recommended preset](./presets) if it doesn't find a configuration file. If it found, apply according to it.

## Setting rules

It need a [configuration file](/docs/configuration). You ready it then you add [rules](/docs/rules) needed to the `rules` property.

```json class=config
{
  "rules": {
    // Add to here
    "[rule-name]": true,
    "[rule-name2]": "Any Value",
    "[rule-name3]": {
      "value": 12345
    }
  }
}
```

It's to be enabled if specified besides `false` as the value. So it's to be disabled when specified `false` as it. The details of the value is said by [`rule`](/docs/configuration/properties#rules) property.

## Applying to some

If you want the part of structures only to apply rules then set with [**selector**](./selectors) to `nodeRules` or `childNodeRules` property.
`nodeRules` affect only the target element. And `childNodeRules` affect child (includes descendants if set to `inheritance`) elements of the target element.

```json class=config
{
  "nodeRules": [
    {
      // Only apply to <main>
      "selector": "main",
      "rules": {
        "class-naming": "/[a-z]+(__[a-z]+)?/"
      }
    },
    {
      // Only apply to elements has "some-class-name" class
      "selector": ".some-class-name",
      "rules": {
        "required-attr": true
      }
    }
  ],
  "childNodeRules": [
    {
      // Only apply to child nodes of elements has ".ignoreClass" class
      "selector": ".ignoreClass",
      "rules": {
        "character-reference": false
      }
    },
    {
      // Only apply to descendant nodes of elements has ".ignoreA11y" class
      "selector": ".ignoreA11y",
      "inheritance": true,
      "rules": {
        "wai-aria": false
      }
    }
  ]
}
```

## Customizing preset rules {#customizing-preset-rules}

Presets define **named rules** that you can individually customize. Named rules use the `namespace/rule-name` format and can be disabled, have their severity changed, or be bulk-disabled using a namespace wildcard.

```json class=config
{
  "extends": ["markuplint:recommended"],
  "rules": {
    // Disable a specific named rule
    "a11y/html-lang": false,

    // Change severity of a named rule
    "a11y/no-autofocus-outside-dialog": "warning",

    // Disable all named rules in a namespace
    "a11y/*": false,

    // Disable by base rule name (see properties reference for details)
    "id-duplication": false
  }
}
```

When multiple presets wrap the same base rule (e.g., `a11y/id-duplication` and `html-standard/id-duplication`), both run independently. You can control each independently. Setting the base rule name to `false` disables that specific base rule inside every named rule group that contains it — see [Disabling by base rule name](/docs/configuration/properties#disable-by-base-rule-name) for details.

You can also define your own [named rule groups](/docs/configuration/properties#named-rule-groups) in the `rules` property. See the [configuration reference](/docs/configuration/properties#named-rule-groups) for details.

For the full list of preset named rules, see [Named rules in presets](/docs/guides/presets#named-rules).

## Build-in rules

The detail of each **built-in rule** is said from the [Rules page](/docs/rules/).

## Applying custom rules

Naturally, you can apply the [**custom rule**](./custom-rule) created by you or 3rd party developers.

It applies the rule when specifying its plugin name and rule name solidus separated.

```json class=config
{
  "rules": {
    "[plugin-name]/[rule-name]": true
  }
}
```

The plugin name and rule name are defined below:

```js title="./plugin.js"
import { createPlugin, createRule } from '@markuplint/ml-core';

export default createPlugin({
  name: 'my-plugin',
  create(settings) {
    return {
      rules: {
        'my-rule': createRule({
          verify({ report }) {
            // Evaluation and reporting
            report(/* ... */);
          },
        }),
      },
    };
  },
});
```

```json class=config
{
  "plugins": ["./plugin.js"],
  "rules": {
    "my-plugin/my-rule": true
  }
}
```
