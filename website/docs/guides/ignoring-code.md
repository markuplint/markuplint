# Ignoring code

## Ignoring file {#ignoring-file}

Use [`excludeFiles`](/docs/configuration/properties#excludefiles) property on the configuration.

## Disable rules

### Disable by selector {#disable-by-selector}

Use [`nodeRules`](/docs/configuration/properties#noderules) or [`childNodeRules`](/docs/configuration/properties#childnoderules) property on the configuration.
See [Applying rules to specific elements](./applying-rules/#applying-rules-to-specific-elements).

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

The same approach works for named rules — you can use base rule names or namespace wildcards:

```json class=config
{
  "extends": ["markuplint:recommended"],
  "nodeRules": [
    {
      "selector": ".legacy",
      "rules": {
        // Disable by base rule name — also disables a11y/wai-aria
        "wai-aria": false,

        // Disable all a11y/* named rules on this element
        "a11y/*": false
      }
    }
  ]
}
```

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
    "no-duplicate-id": false
  }
}
```

These features also work in `nodeRules` and `childNodeRules` — see the [nodeRules reference](/docs/configuration/properties#noderules) for details.

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

## Bulk Suppressions {#bulk-suppressions}

:::caution Experimental
This feature is experimental and may change in future releases.
:::

When introducing new rules to an existing project, you can suppress all current violations and enforce rules only on new code. This is useful when fixing all existing violations at once is not practical.

### Workflow

```shell
# 1. Enable new rules in your config, then suppress all current errors
$ markuplint --suppress "src/**/*.html"

# 2. Commit the generated suppressions file to your repository
$ git add markuplint-suppressions.json

# 3. From now on, only new violations are reported
$ markuplint "src/**/*.html"

# 4. As you fix existing violations, clean up stale entries
$ markuplint --prune-suppressions "src/**/*.html"
```

### How it works

The `--suppress` command records current `error`-severity violations in a `markuplint-suppressions.json` file. On subsequent runs, markuplint reads this file and suppresses the recorded violations. If the number of violations for a file+rule pair **exceeds** the suppressed count, **all** violations for that pair are reported — this prevents new regressions from being hidden.

Each entry includes an optional **scope selector** that narrows the suppression to a specific DOM subtree. The scope is computed automatically using the [Lowest Common Ancestor (LCA)](https://en.wikipedia.org/wiki/Lowest_common_ancestor) of all violation nodes.

```json title="markuplint-suppressions.json"
{
  "src/index.html": {
    "no-duplicate-attr": { "count": 3, "scope": "#main-nav > ul" }
  }
}
```

### Key behaviors

- Only `error`-severity violations are suppressed; `warning` and `info` always pass through
- `--suppress` always exits with code 0 (success)
- `--suppress` and `--prune-suppressions` cannot be used together
- The suppressions file should be committed to your repository

### CLI options

| Option                           | Description                                                                     |
| -------------------------------- | ------------------------------------------------------------------------------- |
| `--suppress`                     | Record all current error violations                                             |
| `--suppress-rule <rule>`         | Record only violations for the specified rule                                   |
| `--prune-suppressions`           | Remove entries for violations that have been fixed                              |
| `--suppressions-location <path>` | Custom path for the suppressions file (default: `markuplint-suppressions.json`) |

### Scope selector

The scope selector narrows suppression to a specific part of the document. It is generated automatically and uses the following strategy (in priority order):

1. **`#id`** — if the ancestor has an `id` attribute
2. **`tag.class`** — if the ancestor has CSS classes
3. **`tag[role="..."]`** — if the ancestor has a `role` attribute (or `type` for `<input>`)
4. **`tag:nth-of-type(n)`** — to disambiguate same-tag siblings

If the scope cannot be narrowed (e.g., violations span the entire document), the suppression applies to the whole file.

When a scope selector no longer matches any element (e.g., after refactoring), the suppression remains active and `--prune-suppressions` will recommend cleanup. **Broken scopes never cause new violations to be hidden.**

## Next steps

- **[CLI](/docs/guides/cli)** — Full list of CLI options including `--suppress` and `--prune-suppressions`
- **[Applying Rules](/docs/guides/applying-rules)** — Fine-tune rules instead of disabling them entirely
- **[Configuration Properties](/docs/configuration/properties)** — Reference for `excludeFiles`, `nodeRules`, `childNodeRules`, and `overrides`
