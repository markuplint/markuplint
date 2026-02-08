# Maintenance Guide

## Commands

```bash
# Build
yarn build --scope @markuplint/ml-core

# Watch mode
yarn dev --scope @markuplint/ml-core

# Clean build output
yarn clean --scope @markuplint/ml-core

# Test (from repo root)
yarn test --scope @markuplint/ml-core
```

## Testing

### Test Files

| File                | Purpose                                                                |
| ------------------- | ---------------------------------------------------------------------- |
| `src/test/index.ts` | Test utility exports (`createTestDocument`, `createTestElement`, etc.) |

### Using Test Utilities

The package provides test helpers commonly used by `@markuplint/rules` and other consumers:

```typescript
import { createTestDocument, createTestElement, dummySchemas } from '@markuplint/ml-core';

// Parse HTML into an MLDocument for testing
const doc = createTestDocument('<div class="foo"><p>Hello</p></div>');

// Access the node list
for (const node of doc.nodeList) {
  console.log(node.nodeName);
}

// Get the first element directly
const el = createTestElement('<button type="submit">Click</button>');
console.log(el.localName); // 'button'
console.log(el.getAttribute('type')); // 'submit'
```

### Test with Custom Config

```typescript
const doc = createTestDocument('<div></div>', {
  config: {
    rules: {
      'my-rule': true,
    },
    nodeRules: [{ selector: 'div', rules: { 'my-rule': 'custom-value' } }],
  },
});
```

### Test with Custom Parser

```typescript
import { parser as vueParser } from '@markuplint/vue-parser';

const doc = createTestDocument('<template><div></div></template>', {
  parser: vueParser,
});
```

## Recipes

### 1. Add a Property to an MLDOM Node Class

1. Identify the target class in `src/ml-dom/node/` (e.g., `element.ts` for `MLElement`)
2. Add the property as a getter or readonly field
3. If the property derives from AST data, use `this.#astNode` (private AST reference)
4. If the property needs spec data, access it via `this.ownerMLDocument.specs`
5. Update the type definitions in `src/ml-dom/node/types.ts` if introducing a new type
6. Verify the build: `yarn build --scope @markuplint/ml-core`

**Example: Adding a `hasId` property to MLElement**

```typescript
// In src/ml-dom/node/element.ts
get hasId(): boolean {
  return this.hasAttribute('id');
}
```

### 2. Handle DOM API Updates (TypeScript DOM Type Changes)

When the TypeScript built-in DOM type definitions are updated (e.g., a new property is added to `Element` or `Node`), MLDOM classes that `implements` those interfaces will produce type errors. This is intentional -- it ensures no gaps go unnoticed.

**Process:**

1. Run `yarn build --scope @markuplint/ml-core` and collect the type errors
2. For each missing property or method, decide:
   - **Implement**: If the API is useful for lint rules (e.g., `querySelector`, `getAttribute`) → implement the actual logic
   - **Mark as unsupported**: If the API is not meaningful in static analysis (e.g., `requestFullscreen`, `animate`) → add a stub that throws `UnexpectedCallError`
3. For unsupported stubs, follow the existing pattern:

```typescript
/**
 * **IT THROWS AN ERROR WHEN CALLING THIS.**
 *
 * @unsupported
 * @implements DOM API: `Element`
 */
someNewMethod(): void {
  throw new UnexpectedCallError('Not supported "someNewMethod" method');
}
```

4. Verify the build passes: `yarn build --scope @markuplint/ml-core`

### 3. Create a New Linting Rule

Rules live in `@markuplint/rules`, but use the `createRule` API from this package:

```typescript
import { createRule } from '@markuplint/ml-core';

export default createRule({
  defaultSeverity: 'error',
  defaultValue: true,
  async verify({ document, report, t }) {
    await document.walkOn('Element', el => {
      if (/* violation condition */) {
        report({
          scope: el,
          message: t('Violation message'),
        });
      }
    });
  },
});
```

For testing rules in isolation, use `createTestRule` from `src/ml-rule/create-test-rule.ts`:

```typescript
import { createRule as createTestRule } from '@markuplint/ml-core/test';
const rule = createTestRule({ name: 'my-rule', ...seed });
```

### 4. Modify Pretender Configuration

Pretenders are processed in `MLDocument` constructor (`src/ml-dom/node/document.ts`):

1. Pretender definitions come from `MLFabric.pretenders`
2. During document construction, each element is checked against pretender selectors
3. Matching elements get a `pretenderContext` assigned
4. To change pretender behavior, modify the pretender initialization logic in `MLDocument`
5. Test with `createTestDocument` using the `pretenders` option

### 5. Change Rule Mapping Logic (RuleMapper)

The `RuleMapper` class (`src/ml-dom/node/rule-mapper.ts`) controls how rules are applied to nodes:

1. `apply()` iterates through global rules, nodeRules, and childNodeRules
2. For each matching selector, it creates a `MappingLayer` with specificity
3. `set()` assigns the layer to the target node, resolving conflicts by specificity
4. To add a new mapping source, add a new iteration block in `apply()` and define the appropriate `from` value

### 6. Add a New Node Type to walkOn

`walkOn()` is defined in `MLDocument` (`src/ml-dom/node/document.ts`):

1. Add a new case to the `type` parameter union: `'Element' | 'Text' | 'Comment' | 'Attr' | 'ElementCloseTag' | 'NewType'`
2. Add the filtering logic in the `walkOn()` method to select matching nodes from `nodeList`
3. Update the `Walker` type in `src/ml-dom/helper/walkers.ts` if needed
4. Update downstream code in `@markuplint/rules` that uses `walkOn()`

## Downstream Impact Checklist

Changes to `@markuplint/ml-core` can affect:

- [ ] **`@markuplint/rules`** — All built-in rules depend on MLDOM classes and `createRule`
  - Changes to node properties/methods affect rules that access them
  - Changes to `walkOn()` or `MLRuleContext` affect all rules
  - Changes to `RuleMapper` affect rule configuration resolution
- [ ] **`markuplint`** — CLI and API depend on `MLCore`, `ViolationCollector`, `convertRuleset`
  - Changes to `MLCore.verify()` signature or behavior affect `MLEngine`
  - Changes to `MLFabric` type affect engine initialization

## Troubleshooting

### Rule is not being executed

1. Check if the rule is registered in the ruleset config (`rules` field)
2. Verify the rule name matches exactly (case-sensitive)
3. Check `RuleMapper` output: use `document.debugMap()` to see the rule mapping
4. Verify the rule's `walkOn` type matches the node type you expect
5. Check if nodeRules/childNodeRules selectors are overriding the global rule to disable it

### Pretender is not taking effect

1. Verify the pretender selector matches the target element: use `element.matches(selector)` to test
2. Check that pretender definitions are passed through `MLFabric.pretenders`
3. Ensure the pretender `as` value is a valid HTML element name
4. Check `element.pretenderContext` is not `null` after document construction

### DOM tree structure is incorrect

1. Compare `document.debugMap()` output with expected structure
2. Check the parser output: parse the same source with the parser directly and inspect the AST
3. Verify ghost elements (implicit HTML/head/body) are handled correctly
4. For template engines, check that `MLBlock` nodes with `conditionalType` wrap the expected children
5. Use `document.nodeList` to inspect the flat node list and verify parent-child relationships
