# MLDOM Overview

## Overview

MLDOM is a DOM Standard-conforming abstraction layer that wraps `@markuplint/ml-ast` AST nodes into DOM interface implementation classes. Each MLDOM class provides the corresponding DOM API (`Node`, `Element`, `Document`, etc.) while extending it with markuplint-specific features like rule storage, token-level source tracking, and accessible name computation.

All MLDOM classes are generic over two type parameters:

- `T extends RuleConfigValue` -- The rule configuration value type
- `O extends PlainData` -- The rule options type

These generics exist **solely for `createRule`**. They propagate through the entire node tree so that 3rd party rule authors get type-safe access to `node.rule` within `verify()` and `fix()` callbacks:

```typescript
// 3rd party rule -- T = 'always' | 'never', O = { allow: string[] }
export default createRule<'always' | 'never', { allow: string[] }>({
  defaultValue: 'always',
  defaultOptions: { allow: [] },
  async verify({ document, report, t }) {
    await document.walkOn('Element', el => {
      // el.rule is typed as RuleInfo<'always' | 'never', { allow: string[] }>
      const { value, options } = el.rule;
      //      ^'always'|'never'  ^{ allow: string[] }
    });
  },
});
```

The type flow is: `createRule<T, O>` → `RuleSeed<T, O>` → `MLRuleContext<T, O>` → `MLDocument<T, O>` → `walkOn` walker → `MLElement<T, O>` → `el.rule: RuleInfo<T, O>`.

#### Runtime Reality: Intentionally Dirty Implementation

Despite the generics appearing on every MLDOM class, the **runtime implementation bypasses type safety entirely**. This is a deliberate, pragmatic design choice:

1. **`node.rules` is untyped**: declared as `Record<string, AnyRule>` (`node.ts` line 190)
2. **`RuleMapper` uses `<any, any>`**: the mapper accepts `MLNode<any, any>` and assigns rules without type constraints (`rule-mapper.ts` line 47: `node.rules[ruleName] = rule.rule`)
3. **Type safety is recovered via cast**: the `node.rule` getter casts the stored rule with `as Rule<T, O>` to produce a typed `RuleInfo<T, O>` (`node.ts` line 514: `settingRule as Rule<T, O>`)

```
Compile time:  MLNode<T, O>  →  node.rule: RuleInfo<T, O>  ← type-safe for rule authors
                   ↕
Runtime:       node.rules = Record<string, AnyRule>  ← untyped storage
               RuleMapper assigns rules as <any, any>  ← ignores generics
               node.rule getter casts `as Rule<T, O>`  ← recovers type
```

This approach may confuse first-time contributors who see `<T, O>` on every MLDOM class but cannot find where these types are actually constrained at runtime. The answer is: they are not. The generics are a compile-time-only mechanism that exists entirely for the DX of 3rd party rule authors using `createRule`.

### UnexpectedCallError

MLDOM classes implement TypeScript's built-in DOM type interfaces (e.g., `MLNode implements Node`, `MLElement implements Element`). This `implements` declaration is a **maintenance strategy**: by declaring conformance to the DOM interfaces, TypeScript's type checker ensures that MLDOM classes keep up with the DOM API surface. When the built-in DOM type definitions are updated (e.g., new properties added to `Element`), the compiler reports errors, preventing unnoticed gaps.

DOM methods that are not meaningful in a static analysis context (i.e., unlikely to be used by markuplint rules or custom rules) throw `UnexpectedCallError` when called. This includes mutation methods (`appendChild`, `removeChild`), event methods (`addEventListener`, `dispatchEvent`), and layout-dependent properties (`clientHeight`, `offsetWidth`).

## Class Hierarchy

```
MLToken<A extends MLASTToken>
  └── MLNode<T, O, A extends MLASTNode>  (abstract, implements Node)
        ├── MLAttr<T, O>  (implements Attr)
        ├── MLCharacterData<T, O, A>  (abstract, implements CharacterData)
        │     ├── MLText<T, O>  (implements Text)
        │     └── MLComment<T, O>  (implements Comment)
        ├── MLDocumentType<T, O>  (implements DocumentType)
        ├── MLBlock<T, O>
        ├── MLElementCloseTag<T, O>
        └── MLParentNode<T, O, A>  (abstract, implements ParentNode)
              ├── MLElement<T, O>  (implements Element, HTMLElement)
              ├── MLDocumentFragment<T, O>  (implements DocumentFragment)
              └── MLDocument<T, O>  (implements Document)
```

## MLToken

**Source:** `src/ml-dom/token/token.ts`

Base token class that wraps an `MLASTToken` with positional information and provides both raw and fixed (corrected) string representations. This is the foundation for all MLDOM nodes.

### Properties

| Property      | Type     | Description                                                                       |
| ------------- | -------- | --------------------------------------------------------------------------------- |
| `uuid`        | `string` | Unique identifier for this token                                                  |
| `raw`         | `string` | Original source text (immutable)                                                  |
| `fixed`       | `string` | Fixed (modified) source text; initially equals `raw`. Updated via `fix()` method. |
| `startLine`   | `number` | One-based start line number                                                       |
| `endLine`     | `number` | One-based end line number                                                         |
| `startCol`    | `number` | One-based start column number                                                     |
| `endCol`      | `number` | One-based end column number                                                       |
| `startOffset` | `number` | Zero-based start character offset                                                 |
| `endOffset`   | `number` | Zero-based end character offset                                                   |

### Methods

| Method     | Signature                           | Description                                                  |
| ---------- | ----------------------------------- | ------------------------------------------------------------ |
| `fix`      | `fix(raw: string): void`            | Updates `fixed` with corrected content for lint auto-fix     |
| `toString` | `toString(fixed?: boolean): string` | Returns `fixed` content when `true`, otherwise returns `raw` |

### Coordinate System

Offsets are zero-based (counting from 0), while lines and columns are one-based (counting from 1). This matches the conventions used by most text editors and error reporters.
