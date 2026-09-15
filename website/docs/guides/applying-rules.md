# Applying Rules

Markuplint applies the [recommended preset](/docs/guides/presets) by default when no [configuration file](/docs/configuration) is found. Once you have a configuration file, you can customize which rules are active and how they behave.

## Customizing preset rules {#customizing-preset-rules}

If you're using a [preset](/docs/guides/presets), you can override individual rules without leaving the preset. Presets define **named rules** in the `namespace/rule-name` format (e.g., `a11y/html-lang`), which you can disable, change severity, or bulk-control using a namespace wildcard:

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

    // Disable by base rule name (affects every preset containing it)
    "no-duplicate-id": false
  }
}
```

When multiple presets wrap the same base rule (e.g., `a11y/id-duplication` and `html-standard/id-duplication`), both run independently. Setting the base rule name to `false` disables it inside every named rule group — see [Disabling by base rule name](/docs/configuration/properties#disable-by-base-rule-name) for details.

You can also define your own [named rule groups](/docs/configuration/properties#named-rule-groups). For the full list of preset named rules, see [Named rules in presets](/docs/guides/presets#named-rules).

## Enabling individual rules

Add rules to the `rules` property in your configuration file. Any value other than `false` enables the rule:

```json class=config
{
  "rules": {
    "no-duplicate-attr": true,
    "class-naming": "/[a-z]+/",
    "require-attr": {
      "value": "true"
    }
  }
}
```

Set a rule to `false` to disable it. See the [`rules` property reference](/docs/configuration/properties#rules) for the full value format.

The complete list of available rules is on the [Rules page](/docs/rules/).

## Applying rules to specific elements

To apply rules only to certain elements, use [**selectors**](./selectors) with the `nodeRules` or `childNodeRules` property.

**`nodeRules`** applies rules to the matched elements only:

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

**`childNodeRules`** applies rules to child elements of the matched elements. Set `inheritance` to `true` to include all descendants:

```json class=config
{
  "childNodeRules": [
    {
      "selector": ".legacy-section",
      "inheritance": true,
      "rules": {
        // Also disables virtual rules like a11y/wai-aria/non-existent-role
        "no-unknown-role": false
      }
    }
  ]
}
```

You can use base rule names (e.g., `"no-unknown-role"`) and namespace wildcards (e.g., `"a11y/*": false`) in both `nodeRules` and `childNodeRules`. These automatically apply to virtual rules created by presets — see the [nodeRules reference](/docs/configuration/properties#noderules) for details.

## Using custom rules

You can use rules created by third-party developers or [create your own](./custom-rule). Specify the plugin name and rule name separated by a slash:

```json class=config
{
  "plugins": ["./my-plugin.js"],
  "rules": {
    "my-plugin/my-rule": true
  }
}
```

## Next steps

- **[Selectors](/docs/guides/selectors)** — Learn the selector syntax for targeting specific elements
- **[Using Presets](/docs/guides/presets)** — See what each preset includes and how to combine them
- **[Configuration Properties](/docs/configuration/properties)** — Full reference for all configuration options
