# CLI Breaking Changes: v4 to v5 Migration Guide

## Who This Guide Is For

- **CLI users** who run `markuplint` from the command line
- **CI/CD maintainers** who have `markuplint` in their pipelines

## Summary of Changes

| Change | Impact |
|--------|--------|
| `--allow-warnings` default changed to `true` | Exit code behavior |
| `--allow-warnings` renamed to `--no-allow-warnings` | CLI flag name |
| `--config` no longer merges with auto-discovered config | Config loading behavior |

## `--allow-warnings` Default Changed

In v4, warnings caused a non-zero exit code by default. In v5, warnings are allowed by default (exit code 0).

### v4 Behavior

```bash
# Warnings cause exit code 1
markuplint index.html
echo $?  # 1 (if warnings exist)

# Explicitly allow warnings
markuplint --allow-warnings index.html
echo $?  # 0
```

### v5 Behavior

```bash
# Warnings are allowed by default (exit code 0)
markuplint index.html
echo $?  # 0 (even if warnings exist)

# Explicitly disallow warnings
markuplint --no-allow-warnings index.html
echo $?  # 1 (if warnings exist)
```

### Migration

If your CI pipeline relied on the default behavior to catch warnings:

```bash
# v4
markuplint index.html

# v5 — add --no-allow-warnings to preserve the same behavior
markuplint --no-allow-warnings index.html
```

If your CI pipeline already used `--allow-warnings`, simply remove the flag:

```bash
# v4
markuplint --allow-warnings index.html

# v5 — no longer needed (this is the default)
markuplint index.html
```

> **Tip**: Use `--max-warnings=N` for finer control over the allowed number of warnings.

## `--config` No Longer Merges with Auto-Discovered Config

In v4, using `--config` to specify a config file still loaded the default config file (e.g., `.markuplintrc`) and merged them. In v5, `--config` now implies `--no-search-config` — only the specified file is used.

### v4 Behavior

```bash
# Both custom.json AND .markuplintrc are loaded and merged
markuplint --config custom.json index.html
```

### v5 Behavior

```bash
# Only custom.json is loaded; .markuplintrc is ignored
markuplint --config custom.json index.html
```

### Migration

If you relied on merging your `--config` file with the project's `.markuplintrc`, use the `extends` field in your config file instead:

```json
{
  "extends": ["./.markuplintrc"],
  "rules": {
    "your-custom-rule": true
  }
}
```
