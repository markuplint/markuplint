# CLI Breaking Changes: v4 to v5 Migration Guide

## Who This Guide Is For

- **CLI users** who run `markuplint` from the command line
- **CI/CD maintainers** who have `markuplint` in their pipelines

## Summary of Changes

| Change | Impact |
|--------|--------|
| `--allow-warnings` default changed to `true` | Exit code behavior |
| `--allow-warnings` renamed to `--no-allow-warnings` | CLI flag name |

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
