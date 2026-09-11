# Monorepo

Setting up Markuplint across multiple packages in a monorepo.

## Strategy

Place a **shared configuration** at the repository root, and use **package-level overrides** where needed. Markuplint automatically searches upward from each target file, so a root `.markuplintrc` applies to all packages.

## Configuration

### Root configuration (shared)

```json class=config title=".markuplintrc"
{
  "extends": ["markuplint:recommended"],
  "parser": {
    "\\.[jt]sx$": "@markuplint/jsx-parser"
  },
  "specs": {
    "\\.[jt]sx$": "@markuplint/react-spec"
  }
}
```

### Package-level override (optional)

A package that needs different rules can have its own `.markuplintrc`. Markuplint uses the **closest** configuration file, so the package-level config takes full precedence:

```json class=config title="packages/legacy-app/.markuplintrc"
{
  "extends": ["markuplint:recommended"],
  "rules": {
    "class-naming": false,
    "no-unescaped-char": false,
    "no-malformed-character-reference": false
  }
}
```

:::info
Markuplint **stops searching** when it finds the closest configuration file. This is different from ESLint's cascading behavior. If the package-level config should inherit from the root, use `extends` to reference it:

```json class=config title="packages/legacy-app/.markuplintrc"
{
  "extends": ["../../.markuplintrc"],
  "rules": {
    "class-naming": false
  }
}
```

:::

## Running in CI

Add a single lint script at the repository root:

```json title="package.json"
{
  "scripts": {
    "lint:html": "markuplint \"packages/*/src/**/*.{html,jsx,tsx,vue}\""
  }
}
```
