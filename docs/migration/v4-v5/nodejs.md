# Node.js Breaking Changes: v4 to v5 Migration Guide

## Who This Guide Is For

- **All markuplint users** upgrading from v4 to v5

## Summary of Changes

| Change | Impact |
|--------|--------|
| Minimum Node.js version raised to v22 | All users |
| Polyfills removed (`uuid`, `@ungap/structured-clone`) | Internal only |
| TypeScript target changed to ES2022 | Custom rule/plugin authors |

## Node.js >= 22 Required

v5 requires Node.js v22.0.0 or later. All packages now include an `engines` field enforcing this minimum.

### v4

Node.js v18.18.0 or later.

### v5

Node.js v22.0.0 or later.

### Migration

Check your Node.js version before upgrading:

```bash
node -v
# Must be v22.0.0 or later
```

If you are using a version manager (nvm, volta, fnm, etc.):

```bash
# nvm
nvm install 22
nvm use 22

# volta
volta install node@22
```

Update your CI configuration to use Node.js 22+:

```yaml
# Before
node-version: [18, 20]

# After
node-version: [22, 24]
```

## Removed Polyfills

v5 uses native APIs that require Node.js 22+. The following polyfills have been removed internally:

- `uuid` — replaced by `crypto.randomUUID()` (native since Node.js 19)
- `@ungap/structured-clone` — replaced by native `structuredClone()` (native since Node.js 17)

These are internal implementation details. If your project used these as transitive dependencies from markuplint, add them directly to your own `package.json`.

## TypeScript Target

The TypeScript compilation target has changed from ES2020 to ES2022. This enables native support for:

- `Array.prototype.toSorted()`
- `Array.prototype.toReversed()`
- `Array.prototype.toSpliced()`
- Top-level `await`
- `cause` property on `Error`

If you develop custom rules or parser plugins that compile with markuplint's TypeScript configuration, ensure your runtime supports ES2022.
