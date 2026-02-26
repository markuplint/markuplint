---
sidebar_position: 1
title: Node.js
---

# Node.js

:::caution Required for all users
Markuplint v5 requires **Node.js v22.0.0 or later**. Check your version before upgrading.
:::

## Minimum Version: v22.0.0

The minimum Node.js version has been raised from v18.18.0 to **v22.0.0**. All packages now enforce this through the `engines` field.

Check your current version:

```bash
node -v
# Must be v22.0.0 or later
```

### Using a version manager

```bash
# nvm
nvm install 22
nvm use 22

# volta
volta install node@22
```

### Updating CI configuration

```yaml
# Before (v4)
node-version: [18, 20]

# After (v5)
node-version: [22, 24]
```

## Removed Polyfills

v5 uses native APIs instead of polyfills. These packages were removed internally:

- `uuid` -- replaced by native `crypto.randomUUID()`
- `@ungap/structured-clone` -- replaced by native `structuredClone()`

:::note
These are internal changes. If your project depended on these as transitive dependencies from Markuplint, add them directly to your `package.json`.
:::

## TypeScript Target Changed to ES2022

The compilation target changed from ES2020 to ES2022. This affects custom rule and parser plugin authors who compile with Markuplint's TypeScript configuration.

Ensure your runtime supports ES2022 features like top-level `await` and `Error.cause`.
