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
