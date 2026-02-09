# Maintenance Guide

## Commands

| Command                                    | Description            |
| ------------------------------------------ | ---------------------- |
| `yarn build --scope @markuplint/ml-config` | Build this package     |
| `yarn dev --scope @markuplint/ml-config`   | Watch mode build       |
| `yarn clean --scope @markuplint/ml-config` | Remove build artifacts |
| `yarn test --scope @markuplint/ml-config`  | Run tests              |

## Testing

Test files follow the `*.spec.ts` naming convention and are located in the `src/` directory:

| Test File              | Coverage                                                                                                     |
| ---------------------- | ------------------------------------------------------------------------------------------------------------ |
| `merge-config.spec.ts` | `mergeConfig()` integration (plugins, parser, overrides, rules), `mergeRule()` edge cases, pretender merging |
| `utils.spec.ts`        | `provideValue()` template rendering, `exchangeValueOnRule()` with value/options/reason                       |

The primary testing pattern for merge tests:

```ts
import { mergeConfig, mergeRule } from './merge-config.js';

expect(mergeConfig(baseConfig, overrideConfig)).toStrictEqual({
  // expected merged result
});
```

For rule merge tests:

```ts
expect(mergeRule(baseRule, overrideRule)).toStrictEqual({
  // expected merged rule
});
```

For template rendering tests:

```ts
import { provideValue, exchangeValueOnRule } from './utils.js';

expect(provideValue('{{ dataName }}', { dataName: 'value' })).toBe('value');
expect(exchangeValueOnRule({ value: '{{ var }}' }, { var: 'x' })).toStrictEqual({ value: 'x' });
```

## Recipes

### 1. Adding a New Property to Config

1. Read `src/types.ts` and locate the `Config` type
2. Add the new readonly property to `Config`:
   ```ts
   readonly newProp?: NewPropType;
   ```
3. Decide whether it belongs in `OptimizedConfig`:
   - If the type changes after merging (like plugins string -> object), use `Omit` + re-define in `OptimizedConfig`
   - If it stays the same, it is inherited automatically via the spread in `OptimizedConfig`
4. Decide whether it belongs in `OverrideConfig`:
   - If it should be top-level only (like `$schema`, `extends`), add the property name to the `NoInherit` union type
   - If it should be overridable per file pattern, leave it as-is (it inherits from `Config` via `Omit<Config, NoInherit>`)
5. Read `src/merge-config.ts` and add the merge logic inside the `mergeConfig()` function's config object:
   - For object deep merge: `newProp: mergeObject(a.newProp, b.newProp)`
   - For array concatenation: `newProp: concatArray(a.newProp, b.newProp)`
   - For array with deduplication: `newProp: concatArray(a.newProp, b.newProp, true)`
   - For simple right-side precedence: `newProp: b.newProp ?? a.newProp` (handled by the spread, but explicit is clearer)
6. Add test cases in `src/merge-config.spec.ts`
7. Build: `yarn build --scope @markuplint/ml-config`
8. Test: `yarn test --scope @markuplint/ml-config`

### 2. Changing a Merge Strategy

1. Read `src/merge-config.ts` and locate the property in the `mergeConfig()` function
2. Identify the current strategy (see the strategy table in `ARCHITECTURE.md`)
3. Replace the merge call. Available strategies:
   - `mergeObject(a.prop, b.prop)` -- Deep merge with right-side precedence
   - `concatArray(a.prop, b.prop)` -- Simple array concatenation
   - `concatArray(a.prop, b.prop, true)` -- Concat with deduplication
   - `concatArray(a.prop, b.prop, true, 'name')` -- Concat with deduplication by named property, merging same-name objects
   - `b.prop ?? a.prop` -- Simple right-side precedence (no merge)
   - Custom helper function for complex transformations
4. Update or add tests in `src/merge-config.spec.ts`
5. Build: `yarn build --scope @markuplint/ml-config`
6. Test: `yarn test --scope @markuplint/ml-config`

### 3. Modifying Rule Merge Logic

1. Read `src/merge-config.ts` and locate the `mergeRule()` function
2. Understand the current flow:
   - `optimizeRule()` normalizes both inputs (handles deprecated `option` -> `options`)
   - `false` check: override `false` or `{value: false}` always returns `false`
   - `undefined` checks: missing side returns the other side
   - Value type check: if override is a direct value (primitive/null/array), it replaces or concatenates
   - Object type merge: severity/value/reason use right-side precedence, options use deep merge
3. Make changes, preserving the key invariants:
   - `false` must always result in absolute disable
   - Array values must be concatenated (not replaced)
   - `options` must use deep merge via `mergeObject()`
4. Verify existing tests pass in `src/merge-config.spec.ts`
5. Add new test cases for the modified behavior
6. Build: `yarn build --scope @markuplint/ml-config`
7. Test: `yarn test --scope @markuplint/ml-config`

### 4. Extending Pretender Types

1. Read `src/types.ts` and locate `Pretender`, `PretenderDetails`, and `OriginalNode`
2. Add new fields to the appropriate type
3. Read `src/merge-config.ts` and check `mergePretenders()`:
   - It converts array form to `{data: [...]}` via `convertPretenersToDetails()`
   - Then deep merges with `mergeObject()`
   - New fields on `PretenderDetails` are automatically deep merged
   - New fields on `Pretender` (inside `data` array) are handled by deepmerge's array merge
4. Add test cases in `src/merge-config.spec.ts`
5. Build: `yarn build --scope @markuplint/ml-config`
6. Test: `yarn test --scope @markuplint/ml-config`

## Upstream Impact Checklist

Changes to upstream packages can affect this package:

| Package                | Impact on ml-config                        |
| ---------------------- | ------------------------------------------ |
| `@markuplint/ml-ast`   | `ParserOptions` type changes               |
| `@markuplint/selector` | `RegexSelector` type changes (re-exported) |
| `@markuplint/shared`   | `Nullable` utility type changes            |

When upstream packages are updated, run:

```shell
yarn test --scope @markuplint/ml-config
```

## Troubleshooting

### Properties disappear after merge

**Symptom:** A property exists in the input config but is missing from the `mergeConfig()` result.

**Cause:** `deleteUndefProp()` removes all properties with `undefined` values. The merge logic may be producing `undefined` for the property.

**Solution:**

1. Check the merge strategy for the property in `mergeConfig()`
2. Verify the helper function does not return `undefined` when both inputs have values
3. `concatArray()` returns `undefined` for empty arrays -- ensure the inputs are not empty

### Rule values are concatenated instead of replaced

**Symptom:** A rule's array value keeps growing instead of being overwritten.

**Cause:** `mergeRule()` concatenates array values by design when both base and override are arrays.

**Solution:** To completely replace an array value, use the object form in the override:

```json
{ "value": ["new", "values"], "options": {} }
```

This replaces the value entirely instead of concatenating.

### Plugin settings are not merged

**Symptom:** Two configs with the same plugin name result in settings from only one side.

**Cause:** If one side uses the string form (`"plugin-name"`) and the other uses the object form (`{name: "plugin-name", settings: {...}}`), the string form has no settings to merge.

**Solution:** Use the object form on both sides:

```json
{ "name": "plugin-name", "settings": { "key": "value" } }
```

### Rule cannot be disabled with false

**Symptom:** Setting a rule to `false` in a local config does not disable it when using extends.

**Cause:** The `mergeConfig()` call order may be reversed. The local config must be the second argument (override).

**Solution:** Ensure the call order is `mergeConfig(extendedConfig, localConfig)` where the local config is the right-side (override) argument.
