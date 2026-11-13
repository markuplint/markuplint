---
sidebar_position: 2
title: 'Plugin mechanism'
---

# Plugin mechanism

The plugin mechanism is removed. Rules come only from the built-in `@markuplint/rules`.

The `parser` and `specs` properties, and the parser and spec packages (also called parser plugins and spec plugins), are not affected.

## Config {#config}

`plugins` and `extends: ["plugin:<name>/<config>"]` are removed. A config that still has them is not honoured silently. It reports a `config-error` warning:

```
"plugins" is not supported: the plugin mechanism was removed in v6 (https://markuplint.dev/docs/migration/v5-to-v6/plugins)
"plugin:<name>/<config>" cannot be extended: the plugin mechanism was removed in v6 (https://markuplint.dev/docs/migration/v5-to-v6/plugins)
```

Before:

```json
{
  "extends": ["markuplint:recommended", "plugin:my-plugin/recommended"],
  "plugins": ["my-plugin"],
  "rules": {
    "my-plugin/my-rule": true
  }
}
```

After:

```json
{
  "extends": ["markuplint:recommended"]
}
```

A plugin rule that is still in `rules` is also reported, as `Rule not found: my-plugin/my-rule`.

A rule name that includes a solidus no longer means "a rule of a plugin". It is a [named rule group](/docs/configuration/properties#named-rule-groups) (`namespace/name` with a `{ "rules": { … } }` value) or the `namespace/*: false` wildcard.

## Rules {#rules}

A rule can no longer come from anywhere but the built-in `@markuplint/rules`:

- Rules from packages named `@markuplint/rule-<name>` or `markuplint-rule-<name>` are not loaded.
- `markuplint --create-rule` and the package `@markuplint/create-rule` are removed.
- `--show-config=details` no longer prints `plugins`, and `ConfigSet.plugins` of `@markuplint/file-resolver` is removed.

## CLI {#cli}

A removed flag exits with code 1 and a message that points here, so that a script that still passes it does not lint differently without a word.

| Flag                       | v6      |
| -------------------------- | ------- |
| `--no-import-preset-rules` | Removed |
| `--create-rule`            | Removed |

## API {#api}

Passing the removed option `rules` or `importPresetRules` to `lint()` or `MLEngine` throws a `TypeError`.

| Removed                                                                          | Note                         |
| -------------------------------------------------------------------------------- | ---------------------------- |
| Option `rules` (custom `MLRule`s)                                                | Only the built-in rules run. |
| Option `importPresetRules`                                                       |                              |
| Option `autoLoad` (deprecated)                                                   |                              |
| `createPlugin()` of `@markuplint/ml-core`                                        |                              |
| Types `Plugin`, `PluginCreator`, `CreatePluginSettings` of `@markuplint/ml-core` |                              |
| Type `PluginConfig` of `@markuplint/ml-config`                                   |                              |
| `ConfigSet.plugins` of `@markuplint/file-resolver`                               |                              |

### Testing API {#testing-api}

The `rules` argument is removed from `mlTest` and `mlTestFile`.

| v5                                                   | v6                                           |
| ---------------------------------------------------- | -------------------------------------------- |
| `mlTest(sourceCode, config, rules?, locale?, fix?)`  | `mlTest(sourceCode, config, locale?, fix?)`  |
| `mlTestFile(target, config?, rules?, locale?, fix?)` | `mlTestFile(target, config?, locale?, fix?)` |

A call from JavaScript that still passes the list of rules as the third argument throws a `TypeError`: the argument is the locale now.

`mlRuleTest` takes only a rule seed of the registry of `@markuplint/rules`. It throws a `TypeError` for anything else.

## What to do {#what-to-do}

1. Remove `plugins` and the `plugin:` entries of `extends` from your config, and the plugin rules from `rules`.
2. The rules you wrote no longer run. Propose the rule to Markuplint so that it can become a built-in rule: [open an issue](https://github.com/markuplint/markuplint/issues) or a pull request. Until then, use another tool for that check.
3. Drop the removed CLI flags and API options from your scripts and tests, and update the calls of `mlTest` and `mlTestFile`.
