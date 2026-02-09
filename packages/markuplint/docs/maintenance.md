# Maintenance Guide

## Commands

| Command                         | Description            |
| ------------------------------- | ---------------------- |
| `yarn build --scope markuplint` | Build this package     |
| `yarn dev --scope markuplint`   | Watch mode build       |
| `yarn clean --scope markuplint` | Remove build artifacts |
| `yarn test --scope markuplint`  | Run tests              |

## Testing

Test files follow the `*.spec.ts` naming convention and are located in the `src/` directory:

| Test File                          | Coverage                                                             |
| ---------------------------------- | -------------------------------------------------------------------- |
| `api/ml-engine.spec.ts`            | MLEngine lifecycle (events, watch mode, config resolution, fromCode) |
| `cli/index.spec.ts`                | CLI integration (stdout output, fix mode, JSON format, flags)        |
| `index.spec.ts`                    | Package integration (HTML file linting end-to-end)                   |
| `reporter/github-reporter.spec.ts` | GitHub Actions annotation output format                              |
| `cli/init/*.spec.ts`               | Initialization wizard (config generation, module selection)          |
| `i18n.spec.ts`                     | Locale loading and fallback behavior                                 |

The primary testing pattern for MLEngine tests:

```ts
import { MLEngine } from './api/index.js';

const engine = await MLEngine.fromCode(sourceCode, {
  config: { rules: { 'rule-name': true } },
  locale: 'en',
});
const result = await engine.exec();
expect(result?.violations).toStrictEqual([
  // expected violations
]);
```

For testing with the testing utilities:

```ts
import { mlRuleTest } from './testing-tool/index.js';

const { violations } = await mlRuleTest(ruleSeed, '<div></div>', { rule: true });
expect(violations).toStrictEqual([
  // expected violations without ruleId
]);
```

## Recipes

### 1. Adding a New CLI Flag

1. Read `src/cli/bootstrap.ts` and locate the `flags` object inside `meow()`
2. Add the new flag definition:
   ```ts
   newFlag: {
     type: 'boolean', // or 'string', 'number'
     default: false,
     shortFlag: 'n', // optional
   },
   ```
3. Update the `help` string at the top of the file to document the new flag
4. Note: `CLIOptions` type updates automatically (it is `typeof cli.flags`)
5. Read `src/cli/command.ts` and extract the flag value from `options`:
   ```ts
   const newFlag = options.newFlag;
   ```
6. Implement the flag's behavior in `command()` or pass it to `MLEngine` options
7. If the flag affects the API layer, add a corresponding property to `APIOptions` in `src/api/types.ts`
8. Add tests in `src/cli/index.spec.ts`
9. Build: `yarn build --scope markuplint`
10. Test: `yarn test --scope markuplint`

### 2. Adding a New Reporter

1. Read existing reporters in `src/reporter/` to understand the pattern:
   - Function takes `MLResultInfo` (and optionally `CLIOptions`)
   - Returns `string[]` (one element per output line)
2. Create `src/reporter/<name>-reporter.ts`:

   ```ts
   import type { MLResultInfo } from '../types.js';

   export function <name>Reporter(results: MLResultInfo) {
     const out: string[] = [];
     for (const violation of results.violations) {
       out.push(/* format violation */);
     }
     return out;
   }
   ```

3. Export from `src/reporter/index.ts`:
   ```ts
   export * from './<name>-reporter.js';
   ```
4. Read `src/cli/output.ts` and add a case to the `switch` statement:
   ```ts
   case '<name>': {
     out = <name>Reporter(results);
     break;
   }
   ```
5. Add tests in `src/reporter/<name>-reporter.spec.ts`
6. Build: `yarn build --scope markuplint`
7. Test: `yarn test --scope markuplint`

### 3. Modifying Configuration Resolution Logic

1. Read `src/api/ml-engine.ts` and locate `resolveConfig()`
2. Understand the current priority:
   - `options.config` (inline config object)
   - `options.configFile` (explicit file path)
   - `ConfigProvider.search()` (auto-discovery, unless `--no-search-config`)
   - `options.defaultConfig` (fallback)
   - `markuplint:recommended` (default when nothing else is configured)
3. Understand `ConfigProvider` from `@markuplint/file-resolver`:
   - `set(config)` registers a config and returns a key
   - `search(file)` finds the nearest config file for a target
   - `resolve(file, keys, cache)` merges all config layers
4. Make changes to `resolveConfig()`, preserving the event emissions (`this.emit('config', ...)`)
5. If adding new API options, update `APIOptions` in `src/api/types.ts`
6. Add tests in `src/api/ml-engine.spec.ts`
7. Build: `yarn build --scope markuplint`
8. Test: `yarn test --scope markuplint`

### 4. Adding an MLEngine Event

1. Read `src/api/types.ts` and locate `MLEngineEventMap`
2. Add the new event type definition:
   ```ts
   'new-event': [filePath: string, data: SomeType, message?: string];
   ```
3. Read `src/api/ml-engine.ts` and add `this.emit('new-event', ...)` at the appropriate point in the pipeline
4. Add tests in `src/api/ml-engine.spec.ts` using `engine.on('new-event', ...)`
5. Build: `yarn build --scope markuplint`
6. Test: `yarn test --scope markuplint`

## Upstream Impact Checklist

Changes to upstream packages can affect this package:

| Package                     | Impact on markuplint                                                                |
| --------------------------- | ----------------------------------------------------------------------------------- |
| `@markuplint/file-resolver` | ConfigProvider API changes, file resolution changes, parser/schema resolver changes |
| `@markuplint/ml-config`     | Config type changes, mergeConfig behavior changes                                   |
| `@markuplint/ml-core`       | MLCore API changes, MLRule interface changes, ViolationCollector changes            |
| `@markuplint/rules`         | Rule additions/removals affect the built-in rule set                                |
| `@markuplint/cli-utils`     | CLI output utility changes, installer API changes                                   |
| `@markuplint/i18n`          | LocaleSet type changes, locale file format changes                                  |

When upstream packages are updated, run:

```shell
yarn test --scope markuplint
```

## Troubleshooting

### Files are not being linted

**Symptom:** A target file exists but no lint results are returned.

**Cause:** Extension mismatch or the file is excluded by `excludeFiles`.

**Solution:**

1. Use `--ignore-ext` to disable extension checking
2. Check the `excludeFiles` setting in the configuration
3. Use `--verbose` to see which files are being skipped and why

### Configuration is not applied

**Symptom:** Rules are not active, the config file is not recognized.

**Cause:** `--no-search-config` is set, or the config file is not in the search path.

**Solution:**

1. Use `--config` to explicitly specify the config file path
2. Use `--show-config` to inspect the computed configuration
3. Check that the config file is in a parent directory of the target file

### Watch mode does not re-lint on config changes

**Symptom:** Config file is modified but re-linting does not happen.

**Cause:** The config file is not in `configSet.files` (the set of files tracked by the watcher).

**Solution:**

1. Use `--verbose` to see which files the watcher is tracking
2. Verify that `ConfigProvider.search()` includes the config file in its result
3. Check that chokidar is correctly watching the file (platform-specific issues)

### mlTest() does not detect violations

**Symptom:** `mlTest()` returns an empty violations array.

**Cause:** When custom `rules` are passed as the third argument, `importPresetRules` defaults to `false`.

**Solution:**

1. Omit the `rules` parameter to use all built-in rules
2. Or explicitly pass the rules you need and ensure the rule configuration enables them
