# @markuplint/ml-config

## Overview

`@markuplint/ml-config` is the configuration system core for markuplint. It provides the `Config` type hierarchy, the merge algorithm that combines multiple configuration layers (base, extends, overrides) into a single optimized config, and a Mustache template rendering system for injecting captured variables into rule settings. The package sits between `@markuplint/file-resolver` (which reads and resolves config files) and `@markuplint/ml-core` (which applies rules using the merged config).

## Directory Structure

```
src/
├── index.ts              — Re-exports all public APIs
├── types.ts              — All type definitions (Config, Rule, Pretender, Violation, etc.)
├── merge-config.ts       — Merge algorithm (mergeConfig, mergeRule, helpers)
├── merge-config.spec.ts  — Merge algorithm tests
├── utils.ts              — Template rendering, rule normalization, type guards
└── utils.spec.ts         — Utils tests
```

## Type System

### Config Type Hierarchy

```mermaid
classDiagram
    class Config {
        +$schema?: string
        +extends?: string | string[]
        +plugins?: (PluginConfig | string)[]
        +parser?: ParserConfig
        +parserOptions?: ParserOptions
        +specs?: SpecConfig
        +excludeFiles?: string[]
        +severity?: SeverityOptions
        +pretenders?: Pretender[] | PretenderDetails
        +rules?: Rules
        +nodeRules?: NodeRule[]
        +childNodeRules?: ChildNodeRule[]
        +overrideMode?: "merge" | "reset"
        +overrides?: Record~string, OverrideConfig~
    }

    class OverrideConfig {
        <<Omit Config NoInherit>>
    }

    class OptimizedConfig {
        +plugins?: PluginConfig[]
        +pretenders?: PretenderDetails
        +overrides?: Record~string, OptimizedOverrideConfig~
    }

    Config --> OverrideConfig : "Omit $schema, extends,\noverrideMode, overrides"
    Config --> OptimizedConfig : "mergeConfig()"
    OverrideConfig --> OptimizedOverrideConfig : "mergeConfig()"
```

### Config to OptimizedConfig Conversion

| Field        | Config                            | OptimizedConfig                           | Conversion                             |
| ------------ | --------------------------------- | ----------------------------------------- | -------------------------------------- |
| `plugins`    | `(PluginConfig \| string)[]`      | `PluginConfig[]`                          | Strings normalized to `{name}` objects |
| `pretenders` | `Pretender[] \| PretenderDetails` | `PretenderDetails`                        | Arrays converted to `{data: [...]}`    |
| `extends`    | `string \| string[]`              | Removed                                   | No longer needed after merging         |
| `$schema`    | `string`                          | Removed                                   | Metadata only                          |
| `overrides`  | `Record<string, OverrideConfig>`  | `Record<string, OptimizedOverrideConfig>` | Each value recursively merged          |

### Rule Type Forms

A rule can be configured in three forms:

| Form    | Type              | Example                              | Meaning                        |
| ------- | ----------------- | ------------------------------------ | ------------------------------ |
| Boolean | `boolean`         | `true` / `false`                     | Enable with defaults / disable |
| Value   | `RuleConfigValue` | `"always"`, `["a","b"]`, `null`      | Shorthand value                |
| Object  | `RuleConfig<T,O>` | `{severity, value, options, reason}` | Full configuration             |

```ts
type Rule<T, O> = RuleConfig<T, O> | Readonly<T> | boolean;

type RuleConfig<T, O> = {
  severity?: Severity; // 'error' | 'warning' | 'info'
  value?: Readonly<T>;
  options?: Readonly<O>;
  reason?: string;
};
```

### NodeRule / ChildNodeRule

- `NodeRule` -- Targets specific nodes by CSS selector, regex selector, ARIA roles, categories, or obsolete flag, then overrides their rule settings. Supports an optional `name` (must contain `/`) for named nodeRule expansion into virtual rules, and an optional `specConformance` (`'normative'` or `'non-normative'`) as metadata for downstream tools and reporting
- `ChildNodeRule` -- Similar to `NodeRule` but targets child nodes; includes an `inheritance` flag to control whether overrides propagate to descendants. Also supports `name` and `specConformance` (metadata) for named nodeRule expansion

### Pretender Types

- `Pretender` -- Uses a CSS selector to make custom elements appear as standard elements for linting purposes; the `as` field specifies the element name or a detailed `OriginalNode`
- `OriginalNode` -- Defines an element's name, slots, namespace, attributes, inherited attributes, and ARIA properties
- `PretenderDetails` -- Normalized form `{data?, files?, imports?}` used after merging

## Merge Algorithm

This is the core of the package. The `mergeConfig()` function combines two configurations with property-specific strategies.

### mergeConfig() Overall Flow

```ts
mergeConfig(a: Config, b?: Config): OptimizedConfig
```

```mermaid
flowchart TD
    A["Input: base (a) + override (b)"] --> B{"b provided?"}
    B -->|Yes| C["Set deleteExtendsProp = true"]
    B -->|No| C2["Set b = {}, deleteExtendsProp = false"]
    C --> D["Spread: {...a, ...b}\n(primitive fields: right-side wins)"]
    C2 --> D
    D --> E["Apply per-property\nmerge strategies\n(see table below)"]
    E --> F{"deleteExtendsProp?"}
    F -->|Yes| G["Delete extends from result"]
    F -->|No| H["Keep extends"]
    G --> I["deleteUndefProp()\nRemove undefined properties"]
    H --> I
    I --> J["Return OptimizedConfig"]
```

### Per-Property Merge Strategy Table

| Property         | Strategy                         | Helper Function                                      | Details                                              |
| ---------------- | -------------------------------- | ---------------------------------------------------- | ---------------------------------------------------- |
| `plugins`        | Concat + deduplicate + normalize | `concatArray(uniquely=true, comparePropName='name')` | Same-name plugins have their settings shallow-merged |
| `parser`         | Object shallow merge             | `mergeObject()`                                      | Right-side wins via `{...a, ...b}`                   |
| `parserOptions`  | Object shallow merge             | `mergeObject()`                                      | Same as above                                        |
| `specs`          | Object shallow merge             | `mergeObject()`                                      | Same as above                                        |
| `excludeFiles`   | Concat + deduplicate             | `concatArray(uniquely=true)`                         | Simple value deduplication                           |
| `severity`       | Object shallow merge             | `mergeObject()`                                      | Same as parser                                       |
| `pretenders`     | Semantic merge                   | `mergePretenders()`                                  | files/imports: override, data: append                |
| `rules`          | Per-rule merge                   | `mergeRules()` then `mergeRule()`                    | **Most complex -- see next section**                 |
| `nodeRules`      | Concat + deduplicate by name     | `concatArray(uniquely=true, comparePropName='name')` | Named entries deduplicated; unnamed entries appended |
| `childNodeRules` | Concat + deduplicate by name     | `concatArray(uniquely=true, comparePropName='name')` | Same as nodeRules                                    |
| `overrideMode`   | Right-side wins                  | `b.overrideMode ?? a.overrideMode`                   | Simple precedence                                    |
| `overrides`      | Per-key recursive merge          | `mergeOverrides()`                                   | Calls `mergeConfig()` recursively for each key       |
| `extends`        | Concat then delete               | `concatArray()`                                      | Removed from result after merge                      |

### mergeRule() -- Rule Merge Details

```ts
mergeRule(a: Nullable<AnyRule>, b: AnyRule): AnyRule
```

This function handles the most complex merge logic. Both inputs are first normalized via `optimizeRule()`.

```mermaid
flowchart TD
    Start["mergeRule(a, b)"] --> OptAB["Normalize both via optimizeRule()"]
    OptAB --> ChkFalse{"b === false OR\nb.value === false?"}
    ChkFalse -->|Yes| RetFalse["return false\n(absolute disable)"]
    ChkFalse -->|No| ChkAUndef{"a === undefined?"}
    ChkAUndef -->|Yes| RetB["return b"]
    ChkAUndef -->|No| ChkBUndef{"b === undefined?"}
    ChkBUndef -->|Yes| RetA["return a"]
    ChkBUndef -->|No| ChkBVal{"b is Value?\n(primitive/null/array)"}
    ChkBVal -->|Yes| ChkAVal{"a is Value?"}
    ChkAVal -->|Yes| RetBVal["return b\n(right-side wins,\narrays override)"]
    ChkAVal -->|No| MergeValObj["Keep a's severity/reason\nOverride value with b"]
    ChkBVal -->|No| MergeObj["severity: b ?? a\nvalue: b ?? a\noptions: mergeObject(a, b)\nreason: b ?? a"]
```

**Key Design Decisions:**

1. **`false` is absolute disable** -- If the override is `false` (or `{value: false}`), the result is always `false`, regardless of what the base config says
2. **Array values override** -- `["a","b"]` + `["c","d"]` results in `["c","d"]` (right-side wins), consistent with ESLint and Biome behavior
3. **options uses shallow merge** -- While severity, value, and reason use right-side-wins precedence, options uses `mergeObject()` (shallow merge via `{...a, ...b}`)

### Helper Functions

#### concatArray(a, b, uniquely?, comparePropName?)

Concatenates two arrays with optional deduplication:

- `uniquely=false` -- Simple concatenation, no deduplication
- `uniquely=true`, no `comparePropName` -- Exact-match deduplication
- `uniquely=true`, with `comparePropName` -- Deduplicates by the specified property name; when two objects share the same name, they are shallow-merged via object spread (e.g., plugin settings)
- Returns `undefined` for empty results

#### mergeObject(a, b)

Shallow merges two objects via `{...a, ...b}`. Right-side values take precedence at the top level. Removes undefined properties from the result.

#### mergeOverrides(a, b)

Collects the union of all keys from both override records. For each key, calls `mergeConfig(a[key], b[key])` recursively. Removes `$schema`, `extends`, and `overrides` from each result (since these are top-level-only properties).

#### mergePretenders(a, b)

Converts array-form pretenders to the normalized `PretenderDetails` form (`{data: [...]}`) then applies semantic merge: `files`/`imports` are overridden (right-side wins), `data` is appended (concatenated).

## Template Rendering System

### provideValue(template, data)

Renders a Mustache template string with the provided data:

- No variables in template -- Returns the template unchanged
- Variables present but no matching keys in data -- Returns `undefined`
- Variables present with matching keys -- Returns the rendered result

### exchangeValueOnRule(rule, data)

Applies Mustache template rendering to all string values within a rule configuration:

- **value** -- String values are rendered; array elements are individually rendered
- **options** -- Recursively renders all string values in the options object
- **reason** -- Rendered as a string

This function is used by `nodeRules` and `childNodeRules` with `regexSelector`, where captured groups (`$0`, `$1`, named captures like `dataName`) are injected as template variables into rule settings.

## Utility Functions

| Function              | Purpose                                                                                           |
| --------------------- | ------------------------------------------------------------------------------------------------- |
| `cleanOptions()`      | Extracts standard fields (`severity`, `value`, `options`, `reason`), removes undefined properties |
| `isRuleConfigValue()` | Type guard: returns `true` for primitives, `null`, and arrays (i.e., not a `RuleConfig` object)   |
| `deleteUndefProp()`   | Removes all properties with `undefined` values from a plain object in-place                       |

## Key Source Files

| File                  | Purpose                                                                                                 |
| --------------------- | ------------------------------------------------------------------------------------------------------- |
| `src/types.ts`        | All type definitions (Config, Rule, Pretender, Violation, etc.)                                         |
| `src/merge-config.ts` | `mergeConfig()`, `mergeRule()`, and all helper functions                                                |
| `src/utils.ts`        | `provideValue()`, `exchangeValueOnRule()`, `cleanOptions()`, `isRuleConfigValue()`, `deleteUndefProp()` |
| `src/index.ts`        | Re-exports all public APIs                                                                              |

## External Dependencies

| Dependency             | Purpose                                        |
| ---------------------- | ---------------------------------------------- |
| `@markuplint/ml-ast`   | `ParserOptions` type (type-only)               |
| `@markuplint/selector` | `RegexSelector` type (re-exported)             |
| `@markuplint/shared`   | `Nullable` utility type                        |
| `is-plain-object`      | Plain object detection in `deleteUndefProp()`  |
| `mustache`             | Template rendering engine for `provideValue()` |
| `type-fest`            | `Writable` utility type                        |

## Integration Points

```mermaid
flowchart LR
    subgraph upstream ["Upstream"]
        fileResolver["@markuplint/file-resolver\n(reads config files,\nresolves extends chain)"]
    end

    subgraph pkg ["@markuplint/ml-config"]
        mergeConfig["mergeConfig()\n(merge algorithm)"]
        types["Config types"]
        templates["Template rendering"]
    end

    subgraph downstream ["Downstream"]
        mlCore["@markuplint/ml-core\n(applies rules using\nOptimizedConfig)"]
        rules["@markuplint/rules\n(uses Rule<T,O>,\nRuleConfig<T,O> types)"]
    end

    fileResolver -->|"calls mergeConfig()\nfor each extends layer"| mergeConfig
    mergeConfig -->|"produces OptimizedConfig"| mlCore
    types -->|"Rule, RuleConfig types"| rules
```

### Upstream

- **`@markuplint/file-resolver`** -- Reads configuration files, resolves the extends chain, and calls `mergeConfig()` to combine layers

### Downstream

- **`@markuplint/ml-core`** -- Receives the merged `OptimizedConfig` and applies rules to the parsed document
- **`@markuplint/rules`** -- Uses `Rule<T,O>` and `RuleConfig<T,O>` types to define rule implementations

## Design Decisions

### Why Not Flat Config?

ESLint's Flat Config approach was evaluated and rejected for markuplint:

- **ESLint itself re-added `extends` to Flat Config in March 2025** -- The pure flat approach proved insufficient even for JavaScript tooling
- **markuplint is JSON-based** -- Flat Config assumes JavaScript. HTML/markup developers (the primary audience) benefit from JSON's schema validation and language-agnostic editing
- **markuplint's `nodeRules`/`childNodeRules` are CSS-selector-based** -- These have no equivalent in Flat Config's file-pattern model
- **ESLint v9 migration caused significant community pain** -- The gradual transition required automated migration tools and years of ecosystem adaptation

**Conclusion:** Improving the JSON-based `extends` merge strategy is the optimal approach for markuplint.

### Merge Strategy Principles

There is a logical distinction between how arrays are handled:

| Array Type                | Examples                               | Merge Behavior | Rationale                              |
| ------------------------- | -------------------------------------- | -------------- | -------------------------------------- |
| **Top-level collections** | `plugins`, `excludeFiles`, `nodeRules` | Accumulate     | Independent items forming a collection |
| **Rule values**           | `["allowed-tag-1", "allowed-tag-2"]`   | Override       | A single rule's configuration value    |

This aligns with ESLint and Biome, where rule values are always overridden by the more specific config.

### Shallow Merge over Deep Merge

| Tool       | Rule options merge           | Rationale                                                             |
| ---------- | ---------------------------- | --------------------------------------------------------------------- |
| ESLint     | Complete replacement         | Simplest, but can be surprising                                       |
| Biome      | Deep merge (via Merge trait) | Full flexibility, higher complexity                                   |
| markuplint | **Shallow merge**            | Middle ground: top-level keys are merged, nested objects are replaced |

The `deepmerge` library was removed in favor of simple object spread (`{...a, ...b}`). This is sufficient because all merged objects in markuplint config (parser, specs, parserOptions, severity, plugin settings, rule options) are flat key-value maps.

## Documentation Map

- [Migration Guide](../../docs/migration/v4-v5/config.md) -- Breaking changes between major versions
- [Maintenance Guide](docs/maintenance.md) -- Commands, recipes, and troubleshooting
