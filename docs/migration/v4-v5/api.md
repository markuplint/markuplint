# API Breaking Changes: v4 to v5 Migration Guide

## Who This Guide Is For

- **Node.js API users** who call markuplint programmatically
- **Custom tool authors** who integrate markuplint via its JavaScript API

## Summary of Changes

| Change | Impact |
|--------|--------|
| `exec` function removed (v1 API) | Users calling `exec()` |

## `exec` Function Removed

The legacy `exec` function (v1 API) has been removed. Use `lint` or `MLEngine` instead.

### v4

```js
import { exec } from 'markuplint';

const results = await exec({
  files: 'index.html',
  config: '.markuplintrc',
});
```

### v5

Using `MLEngine`:

```js
import { MLEngine } from 'markuplint';

const file = await MLEngine.toMLFile('index.html');
const engine = new MLEngine(file, {
  configFile: '.markuplintrc',
});
const result = await engine.exec();
```

### Migration

| v1 (`exec`) option | v5 equivalent |
|---------------------|---------------|
| `files` | First argument to `MLEngine.toMLFile()` |
| `sourceCodes` / `names` / `workspace` | `MLEngine.toMLFile({ sourceCode, name, workspace })` |
| `config` (string) | `configFile` option |
| `config` (object) | `config` option |
| `defaultConfig` | `defaultConfig` option |
| `rules` | `rules` option |
| `rulesAutoResolve` | `autoLoad` option |
| `fix` | `fix` option |
| `locale` | `locale` option |
