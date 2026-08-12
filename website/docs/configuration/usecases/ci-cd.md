# CI/CD integration

Running Markuplint in continuous integration pipelines.

## GitHub Actions

```yaml title=".github/workflows/lint.yml"
name: Lint HTML
on: [push, pull_request]

jobs:
  markuplint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 24
      - run: npm ci
      - run: npx markuplint "src/**/*.html"
```

## Output formats

Use the `--format` flag to integrate with different CI systems:

```shell
# Default human-readable output
markuplint "src/**/*.html"

# GitHub Actions annotations (shown inline in PR diffs)
markuplint "src/**/*.html" --format GitHub

# JSON for custom processing
markuplint "src/**/*.html" --format JSON
```

## Gradual adoption

When introducing Markuplint to an existing project with many violations, use these strategies:

### Limit reported violations

```shell
# Show only the first 50 violations
markuplint "src/**/*.html" --max-count=50
```

### Set warning thresholds

```shell
# Allow up to 30 warnings, fail on any error
markuplint "src/**/*.html" --max-warnings=30
```

### Bulk suppressions

Suppress all current violations and enforce rules only on new code:

```shell
# Record current violations
markuplint "src/**/*.html" --suppress

# Commit the suppressions file
git add markuplint-suppressions.json

# From now on, only new violations are reported
markuplint "src/**/*.html"
```

See [Bulk Suppressions](/docs/guides/ignoring-code#bulk-suppressions) for details.
