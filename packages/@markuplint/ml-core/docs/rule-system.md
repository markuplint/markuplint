# Rule System

Detailed reference for the rule framework in `@markuplint/ml-core`.

## Overview

The rule framework handles the full lifecycle of lint rules: definition, configuration, mapping to nodes, execution, and violation collection. The key components are:

- **RuleSeed** -- Rule definition type (verify/fix functions + defaults)
- **MLRule** -- Rule execution class (wraps a seed with name and config resolution)
- **MLRuleContext** -- Execution context for rules (document access, translation, violation reporting)
- **RuleMapper** -- Maps rule configurations to specific DOM nodes based on selector specificity
- **Ruleset** -- Extracts rules, nodeRules, and childNodeRules from Config

## RuleSeed

Source: `src/ml-rule/types.ts`

The `RuleSeed<T, O>` type defines a rule's implementation.

```typescript
type RuleSeed<T extends RuleConfigValue = boolean, O extends PlainData = undefined> = {
  readonly meta?: {
    readonly category?: 'validation' | 'style' | 'naming-convention' | 'a11y' | 'maintainability';
  };
  readonly defaultSeverity?: Severity;
  readonly defaultValue?: T;
  readonly defaultOptions?: O;
  verify(context: ProvidedContext<T, O>): void | Promise<void>;
  fix?(context: ProvidedContext<T, O>): void | Promise<void>;
};
```

### Category Values

| Category              | Description                     |
| --------------------- | ------------------------------- |
| `'validation'`        | HTML standard compliance checks |
| `'style'`             | Code style and formatting rules |
| `'naming-convention'` | Naming convention enforcement   |
| `'a11y'`              | Accessibility checks            |
| `'maintainability'`   | Code maintainability rules      |

### Default Values

- `defaultSeverity` defaults to `'error'` if not specified
- `defaultValue` defaults to `true` if not specified
- `defaultOptions` defaults to `undefined`

## createRule

Source: `src/ml-rule/create-rule.ts`

Factory function for type-safe rule seed creation:

```typescript
function createRule<T extends RuleConfigValue, O extends PlainData = undefined>(
  seed: Readonly<RuleSeed<T, O>>,
): RuleSeed<T, O>;
```

Returns the seed as-is. Serves primarily as a type helper for TypeScript inference.

### Usage

```typescript
import { createRule } from '@markuplint/ml-core';

export default createRule({
  defaultSeverity: 'error',
  defaultValue: true,
  async verify({ document, report, t }) {
    await document.walkOn('Element', el => {
      if (/* violation condition */) {
        report({ scope: el, message: t('Error message') });
      }
    });
  },
});
```

## MLRule

Source: `src/ml-rule/ml-rule.ts`

`MLRule<T, O>` wraps a `RuleSeed` with a name and provides configuration resolution and verification execution.

### Constructor

```typescript
constructor(o: Readonly<RuleSeed<T, O>> & { readonly name: string })
```

### Properties

| Property          | Type       | Description                                     |
| ----------------- | ---------- | ----------------------------------------------- |
| `name`            | `string`   | Rule identifier (e.g., `"attr-duplication"`)    |
| `defaultSeverity` | `Severity` | Default severity level (from seed or `'error'`) |
| `defaultValue`    | `T`        | Default config value (from seed or `true`)      |
| `defaultOptions`  | `O`        | Default options (from seed)                     |

### Methods

#### `verify(document, locale, fix): Promise<Violation[]>`

Executes the rule against a document.

**Flow:**

1. `document.setRule(this)` -- sets current rule context on document
2. `new MLRuleContext(document, locale)` -- creates execution context
3. `context.provide()` -- generates providable context object
4. `await seed.verify(context)` -- runs verification
5. `await seed.fix(context)` -- runs fix (if `fix=true` and fix function exists)
6. `context.reports` -> `Violation[]` -- maps reports to violations
7. `document.setRule(null)` -- clears rule context

**Report -> Violation mapping:**

- Scope-based reports: extracts `line`, `col`, `raw` from `report.scope` (the node), severity from `report.scope.rule.severity`
- Direct reports: uses `report.line`, `report.col`, `report.raw` directly, severity from `document.rule.severity`

#### `getRuleInfo(ruleSet, ruleName): GlobalRuleInfo<T, O>`

Resolves the full rule information from a ruleset.

Returns:

```typescript
{
  ...RuleInfo<T, O>,               // Global rule config
  nodeRules: RuleInfo<T, O>[],     // Non-disabled node-level overrides
  childNodeRules: RuleInfo<T, O>[], // Non-disabled child-node-level overrides
}
```

#### `optimizeOption(configSettings): RuleInfo<T, O>`

Normalizes raw rule settings into resolved `RuleInfo`.

| Input                  | Result                                                                                  |
| ---------------------- | --------------------------------------------------------------------------------------- |
| `undefined` or `false` | `{ disabled: true, severity: default, value: default, options: default }`               |
| `true`                 | `{ disabled: false, severity: default, value: default, options: default }`              |
| `RuleConfig` object    | `{ disabled: false, severity: config/default, value: config/default, options: merged }` |
| Primitive value        | `{ disabled: false, severity: default, value: input, options: default }`                |

Options merging: arrays are spread (`[...a, ...b]`), objects are spread (`{...a, ...b}`), otherwise fallback to `b ?? a`.

## MLRuleContext

Source: `src/ml-rule/ml-rule-context.ts`

`MLRuleContext<T, O>` provides the execution context for rules.

### Constructor

```typescript
constructor(document: MLDocument<T, O>, locale: LocaleSet)
```

Creates translator from locale, stores document reference.

### Properties

| Property    | Type               | Description                 |
| ----------- | ------------------ | --------------------------- |
| `document`  | `MLDocument<T, O>` | The document being verified |
| `locale`    | `string`           | Locale string               |
| `translate` | `Translator`       | i18n message translator     |

### `provide(): ProvidedContext`

Returns the context object passed to `RuleSeed.verify()` and `RuleSeed.fix()`:

```typescript
{
  document: MLDocument<T, O>,
  translate: Translator,
  t: Translator,        // alias for translate
  reports: Report<T, O>[],
  report: (report) => void | boolean,
}
```

### `report(report)`

Two overloads:

1. **Direct report** (`Report<T, O>`): Pushes the report directly. Returns `undefined`.
2. **Checker report** (`CheckerReport<T, O>`): Calls the function with translator. If it returns a report, pushes it and returns `true`. If `null`/`undefined`, returns `false`.

### Deduplication

Reports are deduplicated in `_push()` using:

- **Scope-based**: same `scope` object + same `message`
- **Position-based**: same `col` + `line` + `message` + `raw`

### Message Finalization

For English locale (`'en'`), the first lowercase letter is capitalized. Other locales pass through unchanged.

## Checker Types

Source: `src/ml-rule/types.ts`

Utility types for building checker functions:

| Type                      | Signature                                                    | Description                |
| ------------------------- | ------------------------------------------------------------ | -------------------------- |
| `Checker<T, O, P>`        | `(params: P) => CheckerReport<T, O>`                         | Generic checker            |
| `ElementChecker<T, O, P>` | `(params: P & { el: Element<T, O> }) => CheckerReport<T, O>` | Element-specific checker   |
| `AttrChecker<T, O, P>`    | `(params: P & { attr: Attr<T, O> }) => CheckerReport<T, O>`  | Attribute-specific checker |
| `CheckerReport<T, O>`     | `(t: Translator) => Report<T, O> \| undefined \| null`       | Deferred report function   |

## Rule Mapping

For detailed documentation on `RuleMapper`, rule configuration resolution (three-layer processing with `rules`, `nodeRules`, `childNodeRules`), specificity-based conflict resolution, merging behavior, and regex selector templates, see the dedicated [Rule Mapping](./ml-dom/rule-mapping.md) reference.

## Ruleset

Source: `src/ruleset/index.ts`

Extracts rule configuration from a `Config` object.

```typescript
class Ruleset {
  readonly rules: Rules;
  readonly nodeRules: readonly NodeRule[];
  readonly childNodeRules: readonly ChildNodeRule[];

  constructor(config: Config);
}
```

- `rules` -- Global rule definitions (from `config.rules`, defaults to `{}`)
- `nodeRules` -- Node-specific overrides (from `config.nodeRules`, defaults to `[]`)
- `childNodeRules` -- Child-node-specific overrides (from `config.childNodeRules`, defaults to `[]`)

## Test Utilities

Source: `src/ml-rule/create-test-rule.ts`

### createTestRule

```typescript
function createRule<T, O>(seed: Readonly<RuleSeed<T, O>> & { readonly name: string }): MLRule<T, O>;
```

Creates an `MLRule` instance for testing. Unlike `createRule()` in `create-rule.ts`, this requires a `name` property and returns an actual `MLRule` instance.

### Test Pattern

```typescript
import { createRule } from '@markuplint/ml-core/test';
import { createTestDocument } from '@markuplint/ml-core/test';

const rule = createRule({
  name: 'my-rule',
  defaultSeverity: 'error',
  async verify({ document, report, t }) {
    // verification logic
  },
});

const doc = createTestDocument('<div></div>');
const violations = await rule.verify(doc, { locale: 'en' }, false);
```
