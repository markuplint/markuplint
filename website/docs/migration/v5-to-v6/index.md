---
sidebar_position: 1
title: 'v5 to v6'
---

# Migrating from v5 to v6

This guide is for upgrading from v5 to v6.

:::danger Changes that stop a config from working as written
The plugin mechanism was removed. A config that still has `plugins` or `plugin:` in `extends` reports a `config-error` warning, and the rules it loaded from plugins no longer run. See [Plugin mechanism](/docs/migration/v5-to-v6/plugins).
:::

## For users

| Area                                                 | Summary                                                                                                  | Who's affected               |
| ---------------------------------------------------- | -------------------------------------------------------------------------------------------------------- | ---------------------------- |
| [Plugin mechanism](/docs/migration/v5-to-v6/plugins) | `plugins`, `plugin:` in `extends`, custom rules, `--create-rule`, and `@markuplint/create-rule` removed. | Plugin and custom rule users |

## For developers

| Area                                                     | Summary                                                                                                                                           | Who's affected                                                                |
| -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| [Plugin mechanism](/docs/migration/v5-to-v6/plugins#api) | The `rules`, `importPresetRules` and `autoLoad` options, `createPlugin()`, and the testing API signatures.                                        | Node.js API, custom rule authors                                              |
| [MLDOM](/docs/migration/v5-to-v6/mldom)                  | MLDOM no longer implements the DOM interfaces: members renamed or removed, `SpecElement` in `@markuplint/ml-spec`, `UnexpectedCallError` removed. | Users of `@markuplint/ml-core`, `@markuplint/ml-spec`, `@markuplint/selector` |
