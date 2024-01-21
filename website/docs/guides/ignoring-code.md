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

### Overriding to disable rules

Use [`overrides`](/docs/configuration/properties#overrides) property on the configuration.

```json class=config
{
  "rules": {
    "[[target-rule-id]]": true
  },
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
