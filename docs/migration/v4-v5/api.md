# API

`markuplint` no longer re-exports the v1 `exec()` helper (`export * from './v1.js'` in v4). Use `MLEngine` (or `lint` where you already do).

```js
import { MLEngine } from 'markuplint';

const file = await MLEngine.toMLFile('index.html');
const engine = new MLEngine(file, { configFile: '.markuplintrc' });
const result = await engine.exec();
```

| v1 `exec()` option | v5 |
| --- | --- |
| `files` | `MLEngine.toMLFile()` |
| `sourceCodes` / `names` / `workspace` | `MLEngine.toMLFile({ sourceCode, name, workspace })` |
| `config` string | `configFile` |
| `config` object | `config` |
| `defaultConfig` | `defaultConfig` |
| `rules` | `rules` |
| `rulesAutoResolve` | Always on; option removed |
| `fix` | `fix` |
| `locale` | `locale` |

`APIOptions.autoLoad` is removed; rules are always loaded.

Removed types/helpers: `MLResultInfo_v1`; `getIndent()` from `@markuplint/ml-core`; `Token.getLine` / `Token.getCol` from `@markuplint/types` (use `Token.getPosition`); `getLine` / `getCol` from `@markuplint/parser-utils` (use `getPosition`).

## `FixSummary`

With `fix: true`, `MLResultInfo.fixSummary` reports pass counts and remaining violations. Top-level `violations` is the first pass. After fix, use `fixSummary.finalPassViolations ?? violations`.

`computeCursorOffset` is exported from `@markuplint/ml-core` to map a cursor through `fixSummary.firstPassEdits`.
