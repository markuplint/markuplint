---
sidebar_position: 2
title: CLI
---

# CLI

Changes to CLI flags and behavior in v5.

## New: `--fix-dry-run`

Preview what `--fix` would change without modifying files. The output is a unified diff:

```bash
markuplint --fix-dry-run index.html
```

```diff
--- a/index.html
+++ b/index.html
@@ -1,1 +1,1 @@
-<input required="required" />
+<input required />
```

:::tip
When both `--fix` and `--fix-dry-run` are specified, `--fix-dry-run` takes precedence. No files are modified.
:::

## `--allow-warnings` Default Changed

In v4, warnings caused a non-zero exit code by default. In v5, warnings are **allowed by default**.

### Before (v4)

```bash
# Warnings cause exit code 1
markuplint index.html
echo $?  # 1 (if warnings exist)
```

### After (v5)

```bash
# Warnings are allowed (exit code 0)
markuplint index.html
echo $?  # 0 (even if warnings exist)
```

### What you need to do

:::caution CI pipelines that rely on catching warnings
Add `--no-allow-warnings` to preserve the old behavior:

```bash
# v4
markuplint index.html

# v5 -- same behavior
markuplint --no-allow-warnings index.html
```

:::

If you already used `--allow-warnings`, remove it. It's now the default:

```bash
# v4
markuplint --allow-warnings index.html

# v5 -- no longer needed
markuplint index.html
```

:::tip
Use `--max-warnings=N` for finer control over warning thresholds.
:::

## `--config` No Longer Merges with Default Config

In v4, `--config` loaded both the specified file and the auto-discovered config (`.markuplintrc`), then merged them. In v5, `--config` uses **only** the specified file.

### Before (v4)

```bash
# Both custom.json AND .markuplintrc are loaded and merged
markuplint --config custom.json index.html
```

### After (v5)

```bash
# Only custom.json is loaded; .markuplintrc is ignored
markuplint --config custom.json index.html
```

### What you need to do

If you relied on merging, use `extends` in your config file instead:

```json
{
  "extends": ["./.markuplintrc"],
  "rules": {
    "your-custom-rule": true
  }
}
```
