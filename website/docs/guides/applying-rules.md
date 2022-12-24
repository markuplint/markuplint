# Applying rules

## Default behavior

Markuplint searches a [configuration file](/configuration) automatically when evaluating. It applies rules that included by [recommended preset](./presets) if it doesn't find a configuration file. If it found, apply according to it.

## Setting rules

It need a [configuration file](/configuration). You ready it then you add [rules](/rules) needed to the `rules` property.

```json
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

It's to be enabled if specified besides `false` as the value. So it's to be disabled when specified `false` as it. The details of the value is said by [`rule`](/configuration/properties#rules) property.

## Applying to some

If you want the part of structures only to apply rules then set with [**selector**](./selectors) to `nodeRules` or `childNodeRules` property.
`nodeRules` affect only the target element. And `childNodeRules` affect child (includes descendants if set to `inheritance`) elements of the target element.

```json
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

## Build-in rules

The detail of each **built-in rule** is said from the [Rules page](/rules/).

## Applying custom rules

Naturally, you can apply the [**custom rule**](./custom-rule) created by you or 3rd party developers.

It applies the rule when specifying its plugin name and rule name solidus separated.

```json title="Configuration"
{
  "rules": {
    "[plugin-name]/[rule-name]": true
  }
}
```

The plugin name and rule name are defined below:

```js title="./plugin.js"
const { createPlugin, createRule } = require('@markuplint/ml-core');

module.exports = createPlugin({
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

```json title="Configuration"
{
  "plugins": ["./plugin.js"],
  "rules": {
    "my-plugin/my-rule": true
  }
}
```
