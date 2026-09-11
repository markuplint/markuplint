---
sidebar_position: 2
title: 'CLI'
---

# CLI

## `--fix-dry-run`

Prints a unified diff of what `--fix` would do, without writing files. If both `--fix` and `--fix-dry-run` are set, dry-run wins (stderr warning).

```bash
markuplint --fix-dry-run index.html
```

## `--allow-warnings` default

v4: warnings produced a non-zero exit status unless `--allow-warnings` was passed.

v5: warnings are allowed by default. Restore v4 with `--no-allow-warnings`.

```bash
# v4 default
markuplint index.html

# v5 equivalent
markuplint --no-allow-warnings index.html
```

`--max-warnings=N` still caps warnings.

## `--config` does not merge

v4: `--config file` loaded that file **and** auto-discovered `.markuplintrc`, then merged.

v5: `--config file` loads **only** that file.

If you relied on the merge, `extends` the project config from the file you pass to `--config`.

## Progressive output by default

v4: results were printed only after every file had been processed.

v5: results print immediately as each file is processed. Restore v4 with `--no-progressive-output`.

```bash
# v4 default
markuplint --no-progressive-output "**/*.html"

# v5 default (no flag needed)
markuplint "**/*.html"
```

JSON output (`--format json`) is unaffected, and always uses batch mode.

## Diagnosing config drift with `--show-config=details`

If a rule you expected to run silently doesn't fire — or a rename/split alias doesn't seem to
apply — run `--show-config=details` on the target file before assuming a bug:

```bash
markuplint --show-config=details path/to/file.html
```

It prints the fully computed configuration for that file as JSON, including:

- `computedConfig` — the final merged config actually used to lint the file
- `configurationFile` / `dependencies` — every config file that contributed, in load order. Useful
  when more than one `.markuplintrc` / `markuplint.config.*` exists in the project and it's unclear
  which one (or which combination) applies to a given file
- `ruleDeprecations` — old rule names found in the resolved config and what they expanded to (see
  [Renames and Splits](/docs/migration/v4-to-v5/rules/rule-names))
- `appliedOverrides` — which [`overrides`](/docs/configuration/properties#overrides) glob(s)
  matched this file, in the order they were applied. See
  [When more than one glob matches the same file](/docs/configuration/properties#when-more-than-one-glob-matches-the-same-file)
  if more than one appears here — the last one can replace everything before it.

This resolves the config only; it does not run rule resolution, so a `Rule not found` config error
won't appear here even if the same config would produce one at lint time.
