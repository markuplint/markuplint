---
sidebar_position: 1
title: 'Node.js'
---

# Node.js

v5 requires **Node.js v24.0.0 or later**. Every published package sets `"engines": { "node": ">=24" }`.

v4 documented **v18.18.0 or later**. v4 packages did not set an `engines` field.

```bash
node -v
# Must be v24.0.0 or later
```

```bash
nvm install 24
nvm use 24
```

```yaml
# v4 CI
node-version: [18, 20]

# v5 CI
node-version: [24]
```

## Polyfills

Internal replacements (add the packages yourself only if your app imported them transitively from Markuplint):

- `uuid` → `crypto.randomUUID()`
- `@ungap/structured-clone` → `structuredClone()`

## TypeScript target

Shared compiler options use `"target": "ES2022"`. Custom rules and parsers that compile against Markuplint's TypeScript config need a runtime that supports ES2022.
