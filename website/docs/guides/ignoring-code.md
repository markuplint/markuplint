# Ignoring code

## Ignoring file

Use [`excludeFiles`](/docs/configuration/properties#excludefiles) property on the configuration.

## Disable rules

### Disable by selector

Use [`nodeRules`](/docs/configuration/properties#noderules) or [`childNodeRules`](/docs/configuration/properties#childnoderules) property on the configuration.
See [Applying to some](./applying-rules/#applying-to-some).

```json class=config
{
  "rules": {
    "any-rule": true
  },
  "nodeRules": [
    {
      "selector": ".ignore",
      "rules": {
        "any-rule": false
      }
    }
  ]
}
```

### Overriding to disable rules

Use [`overrides`](/docs/configuration/properties#overrides) property on the configuration.

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
