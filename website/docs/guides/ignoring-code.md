# Ignoring code

## Ignoring file {#ignoring-file}

Use [`excludeFiles`](/docs/configuration/properties#excludefiles) property on the configuration.

## Disable rules

### Disable by selector {#disable-by-selector}

Use [`nodeRules`](/docs/configuration/properties#noderules) or [`childNodeRules`](/docs/configuration/properties#childnoderules) property on the configuration.
See [Applying to some](./applying-rules/#applying-to-some).

```json class=config
{
  "rules": {
    "[[target-rule-id]]": true
  },
  "nodeRules": [
    {
      "selector": ".ignore",
      "rules": {
        "[[target-rule-id]]": false
      }
    }
  ]
}
```

Replace the `[[target-rule-id]]` portion with [the rule ID](/docs/rules) you would like to disable as appropriate.

### Disable named rules {#disable-named-rules}

Named rules defined by presets can be individually disabled by setting `false` in the `rules` property. You can also use a namespace wildcard to disable all named rules in a namespace at once, or use the base rule name to disable that specific rule inside every named rule group — see [Disabling by base rule name](/docs/configuration/properties#disable-by-base-rule-name) for details.

```json class=config
{
  "extends": ["markuplint:recommended"],
  "rules": {
    // Disable a specific named rule
    "a11y/html-lang": false,

    // Disable all named rules in a namespace
    "a11y/*": false,

    // Disable by base rule name (see properties reference for details)
    "id-duplication": false
  }
}
```

For the list of available named rules, see [Named rules in presets](/docs/guides/presets#named-rules).

### Overriding to disable rules

Use [`overrides`](/docs/configuration/properties#overrides) property with [`overrideMode`](/docs/configuration/properties#overridemode) on the configuration.

```json class=config
{
  "rules": {
    "[[target-rule-id]]": true
  },
  "overrideMode": "merge",
  "overrides": {
    "./path/to/**/*": {
      "rules": {
        "[[target-rule-id]]": false
      }
    }
  }
}
```

Replace the `[[target-rule-id]]` portion with [the rule ID](/docs/rules) you would like to disable as appropriate.
