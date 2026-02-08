# MLDocument

**Source:** `src/ml-dom/node/document.ts`

Root node of the MLDOM tree. Extends `MLParentNode` and implements the DOM `Document` interface.

## Construction

The constructor receives:

1. `ast: MLASTDocument` -- The parsed AST document
2. `ruleset: Ruleset` -- Rule configuration
3. `schemas: MLSchema` -- HTML/ARIA specification data (tuple)
4. `options?` -- Optional configuration:
   - `filename` -- Source file path
   - `endTag` -- `'xml'` | `'omittable'` | `'never'` (default: `'omittable'`)
   - `booleanish` -- Treat omitted boolean-like attributes as `true` (default: `false`)
   - `tagNameCaseSensitive` -- Case-sensitive tag name comparison (default: `false`)
   - `pretenders` -- Array of pretender definitions

Construction steps:

1. Builds a flat `nodeList` by iterating the AST `nodeList`, calling `createNode()` for each non-endtag node, then freezes the array
2. Initializes pretender contexts via `_pretending(pretenders)` for all element nodes
3. Distributes rule configuration to nodes via `_ruleMapping(ruleset)` using `RuleMapper`

## `_pretending(pretenders?)`

Iterates all element nodes in `nodeList` and calls `element.pretending(pretenders)` for each. See [MLElement > Pretender System](./element.md#pretender-system) for details.

## `_ruleMapping(ruleset)`

Distributes rules from the `Ruleset` to individual nodes using `RuleMapper`. The mapping has three layers, applied with increasing specificity:

1. **Global rules** (`ruleset.rules`): Applied to `#document` and every node in `nodeList` with specificity `[0, 0, 0]`
2. **Node rules** (`ruleset.nodeRules`): For each `nodeRule`, match its selector against elements using `matchMLSelector()`. If matched, merge the rule with the global rule and apply with the selector's specificity
3. **Child node rules** (`ruleset.childNodeRules`): For each `childNodeRule`, match the parent selector, then apply merged rules to direct children (or all descendants if `inheritance: true`)

`RuleMapper.set()` uses CSS specificity comparison -- a rule with higher specificity overrides one with lower specificity. `RuleMapper.apply()` transfers the resolved rules from the internal map to each node's `rules` record.

See [rule-system.md](../rule-system.md) for full details on rule resolution.

## Key Properties

| Property               | Type                       | Description                                                           |
| ---------------------- | -------------------------- | --------------------------------------------------------------------- |
| `nodeList`             | `ReadonlyArray<MLNode>`    | Frozen flat list of all nodes in document order                       |
| `specs`                | `MLMLSpec`                 | HTML/ARIA specification data                                          |
| `isFragment`           | `boolean`                  | Whether document is a fragment (no root element required)             |
| `currentRule`          | `Readonly<MLRule> \| null` | Rule currently being evaluated, or `null`                             |
| `endTag`               | `EndTagType`               | End tag handling mode: `'xml'` \| `'omittable'` \| `'never'`          |
| `booleanish`           | `boolean`                  | Whether to treat boolean-like attributes as boolean (default `false`) |
| `tagNameCaseSensitive` | `boolean`                  | Case sensitivity for tag names (default `false`)                      |
| `filename`             | `string \| undefined`      | Source filename                                                       |
| `doctype`              | `MLDocumentType \| null`   | DOCTYPE node if present, found by scanning `nodeList`                 |

## `walkOn(type, walker, skipWhenRuleIsDisabled?)`

Walks nodes of a specific type using `sequentialWalker` over `nodeList`.

**Parameters:**

- `type` -- Node type to walk (see table below)
- `walker` -- Callback function receiving the matched node
- `skipWhenRuleIsDisabled` -- Skip nodes where the current rule is disabled (default: `true`)

| Type                | Walked Over                                                    | Walker Parameter    |
| ------------------- | -------------------------------------------------------------- | ------------------- |
| `'Element'`         | `ELEMENT_NODE` nodes from `nodeList`                           | `MLElement`         |
| `'Text'`            | `TEXT_NODE` nodes from `nodeList`                              | `MLText`            |
| `'Comment'`         | `COMMENT_NODE` nodes from `nodeList`                           | `MLComment`         |
| `'Attr'`            | All attributes on each `ELEMENT_NODE` in `nodeList`            | `MLAttr`            |
| `'ElementCloseTag'` | `closeTag` of each `ELEMENT_NODE` in `nodeList` (skips `null`) | `MLElementCloseTag` |

The `skipWhenRuleIsDisabled` parameter checks `node.rule.disabled` for the current rule. If `true`, the walker is not called for that node. This is how rules respect per-node disable directives.

```typescript
// Walk all elements (skipping disabled nodes by default)
await document.walkOn('Element', async element => {
  console.log(element.localName);
});

// Walk all attributes including disabled nodes
await document.walkOn(
  'Attr',
  async attr => {
    console.log(`${attr.name}="${attr.value}"`);
  },
  false,
);
```

## `getAccessibilityProp(node, ariaVersion?)`

Computes ARIA accessibility properties for a node.

**Flow:**

1. If `node` is not an element → return `null`
2. If the element is a `<slot>` → return `{ unknown: true }` (content is determined at runtime)
3. Call `isExposed()` to determine if the element is exposed to the accessibility tree
4. If not exposed → return `{ unknown: false, exposedToTree: false }`
5. Compute the ARIA role via `getComputedRole()`
6. Compute the accessible name via `getAccname()` (includes pretender context -- see [Helpers: accname](./helpers.md#accname))
7. Determine `nameRequired` and `nameProhibited` from the role definition
8. Check for `<slot>` children -- if present, name may be unknown
9. Compute focusability via `mayBeFocusable()`
10. Collect computed ARIA properties via `getComputedAriaProps()` (required + non-default props)

Returns `AccessibilityProperties` (see [Type Utilities](./helpers.md#type-utilities)).

## `toString(fixed?)`

Reconstructs the source code from the token list.

- `fixed=false` (default): Returns the original `raw` string
- `fixed=true`: Applies offset-tracked replacement:
  1. Get `getTokenList()` (sorted by `startOffset`)
  2. For each token: if `toString(true) !== raw`, splice the fixed content into the string
  3. Track cumulative offset differences to maintain correct positions

## `defaultView`

Returns a mock window object providing `getComputedStyle()` that returns an object with a `getPropertyValue()` stub. This satisfies the **Accessible Name and Description Computation** algorithm interface requirement. All style property values return empty objects.

## Other Methods

| Method                 | Signature                                         | Description                                                                                          |
| ---------------------- | ------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `setRule`              | `setRule(rule: MLRule \| null): void`             | Set/clear the current rule being evaluated                                                           |
| `getTokenList`         | `getTokenList(): ReadonlyArray<MLToken>`          | All tokens for source reconstruction, sorted by offset (cached). Includes both nodes and close tags. |
| `searchNodeByLocation` | `searchNodeByLocation(line, col): MLNode \| null` | Find node at a 1-based source position                                                               |
| `debugMap`             | `debugMap(): string[]`                            | Debug output of document tree structure                                                              |

## endTag Modes

| Value         | Behavior                                             |
| ------------- | ---------------------------------------------------- |
| `'omittable'` | HTML mode: certain end tags may be omitted (default) |
| `'xml'`       | XML mode: all elements must have explicit end tags   |
| `'never'`     | No end tags (e.g., Pug, Slim)                        |
