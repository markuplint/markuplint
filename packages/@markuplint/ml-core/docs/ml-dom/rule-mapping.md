# Rule Mapping — How Rules Are Applied to Nodes

**Source:** `src/ml-dom/node/document.ts` (`_ruleMapping()`), `src/ml-dom/node/rule-mapper.ts` (`RuleMapper`)

## Overview

Rule mapping is the process of distributing rule configurations from the user's config to individual MLDOM nodes. Each node has a `rules` property (`Record<string, AnyRule>`) that stores the resolved rule configuration for every rule that applies to it.

The mapping uses three configuration layers — `rules`, `nodeRules`, and `childNodeRules` — processed in a defined order, with CSS selector specificity used to resolve conflicts.

For configuration syntax, see the [markuplint configuration documentation](https://markuplint.dev/docs/configuration).

## Architecture

### When Rule Mapping Happens

Rule mapping happens **once** during `MLDocument` construction, after pretender initialization and before any rule execution:

```
MLDocument constructor
  ├── 1. Parse AST → create MLDOM nodes (nodeList)
  ├── 2. _pretending(pretenders)
  ├── 3. _ruleMapping(ruleset)            ← Rule mapping
  └── 4. (ready for rule verification)
```

This ordering matters:

- Pretenders must be established first, so that selector matching in rule mapping can match against pretender identities (e.g., a `nodeRules` entry targeting `button` should match `<MyButton>` pretending to be `<button>`)
- Rule mapping must complete before verification, so that rules can read `node.rules` during `walkOn()`

### Components

| Component        | Source                           | Role                                                                      |
| ---------------- | -------------------------------- | ------------------------------------------------------------------------- |
| `Ruleset`        | `src/ruleset/index.ts`           | Extracts `rules`, `nodeRules`, `childNodeRules` from user config          |
| `RuleMapper`     | `src/ml-dom/node/rule-mapper.ts` | Accumulates rule-to-node mappings with specificity, applies them to nodes |
| `_ruleMapping()` | `src/ml-dom/node/document.ts`    | Orchestrates the three-layer processing                                   |

## The Three Layers

### Layer 1: Global Rules (`rules`)

```json
{
  "rules": {
    "attr-duplication": true,
    "case-sensitive-tag-name": "warning"
  }
}
```

Global rules are applied to **every node** in the document, including the `#document` node itself. They have a fixed specificity of `[0, 0, 0]`.

**Processing:**

```typescript
// Apply to #document
for (const ruleName of Object.keys(ruleset.rules)) {
  ruleMapper.set(document, ruleName, {
    from: 'rules',
    specificity: [0, 0, 0],
    rule,
  });
}

// Apply to every node in nodeList
for (const node of document.nodeList) {
  for (const ruleName of Object.keys(ruleset.rules)) {
    ruleMapper.set(node, ruleName, {
      from: 'rules',
      specificity: [0, 0, 0],
      rule,
    });
  }
}
```

### Layer 2: Node Rules (`nodeRules`)

```json
{
  "nodeRules": [
    {
      "selector": "img",
      "rules": {
        "required-attr": { "value": "alt" }
      }
    }
  ]
}
```

Node rules override global rules for **elements that match the selector**. Only `ELEMENT_NODE` and `TEXT_NODE` are considered; text nodes cannot be selector targets, so only elements are actually matched.

**Processing:**

1. For each `nodeRule` entry, check if the current element matches via `matchMLSelector(selector)`
2. If matched, for each rule in the entry:
   - `exchangeValueOnRule(rule, matches.data)` — render Mustache template variables from regex selector captures
   - `mergeRule(globalRule, convertedRule)` — merge with the global rule config (see [Merging](#merging-with-global-rules))
   - `ruleMapper.set(node, ruleName, { from: 'nodeRules', specificity: matches.specificity, rule: mergedRule })`

The specificity comes from the CSS selector used to match the element.

### Layer 3: Child Node Rules (`childNodeRules`)

```json
{
  "childNodeRules": [
    {
      "selector": "table",
      "inheritance": true,
      "rules": {
        "class-naming": "/^table-/"
      }
    }
  ]
}
```

Child node rules apply rules to **children (or descendants)** of matched elements. The selector matches the **parent**, and the rules are distributed to its children.

**Processing:**

1. For each `childNodeRule` entry, check if the current element matches via `matchMLSelector(selector)`
2. If matched, determine the target nodes:
   - `inheritance: true` → all **descendants** (collected via `syncWalk`)
   - `inheritance: false` (default) → only **direct children** (`childNodes`)
3. For each rule in the entry, apply the merged rule to every target node

```typescript
const targetDescendants = nodeRule.inheritance ? descendants : children;

for (const descendant of targetDescendants) {
  ruleMapper.set(descendant, ruleName, {
    from: 'childNodeRules',
    specificity: matches.specificity,
    rule: mergedRule,
  });
}
```

Note: the specificity is that of the **parent's** selector match, not the child's.

## Processing Order

The three layers are processed in a specific order within `_ruleMapping()`:

```
For the #document node:
  1. Apply all global rules (specificity [0,0,0])

For each node in nodeList:
  2. Apply all global rules (specificity [0,0,0])
  3. Apply matching nodeRules (selector specificity)
  4. Apply matching childNodeRules (selector specificity of parent)
```

Because `RuleMapper.set()` resolves conflicts by specificity, the processing order within the same specificity level matters:

- **Same specificity**: later `set()` calls overwrite earlier ones (last-write-wins)
- **Higher specificity**: always wins regardless of order
- **Lower specificity**: silently skipped

This means:

| Scenario                                                                 | Winner                                                     |
| ------------------------------------------------------------------------ | ---------------------------------------------------------- |
| `rules` vs `nodeRules` (any selector)                                    | `nodeRules` (selector specificity `≥ [0,0,1]` > `[0,0,0]`) |
| `rules` vs `childNodeRules` (any selector)                               | `childNodeRules` (same reasoning)                          |
| `nodeRules[0]` vs `nodeRules[1]` (same specificity)                      | `nodeRules[1]` (later in array)                            |
| `nodeRules` (lower specificity) vs `childNodeRules` (higher specificity) | `childNodeRules` (higher specificity wins)                 |
| `nodeRules` (higher specificity) vs `childNodeRules` (lower specificity) | `nodeRules` (higher specificity wins)                      |

## Specificity

### What is Specificity?

Specificity is a three-element tuple `[a, b, c]` based on the CSS Selectors specification:

| Component | Counts                                               | Examples                                            |
| --------- | ---------------------------------------------------- | --------------------------------------------------- |
| `a`       | ID selectors                                         | `#main` → `[1, 0, 0]`                               |
| `b`       | Class selectors, attribute selectors, pseudo-classes | `.foo` → `[0, 1, 0]`, `[type="text"]` → `[0, 1, 0]` |
| `c`       | Type selectors, pseudo-elements                      | `div` → `[0, 0, 1]`, `img` → `[0, 0, 1]`            |

### How Specificity is Compared

`compareSpecificity(a, b)` from `@markuplint/selector` performs a lexicographic comparison:

```typescript
function compareSpecificity(a: Specificity, b: Specificity): -1 | 0 | 1 {
  // Compare a[0] vs b[0], then a[1] vs b[1], then a[2] vs b[2]
  // Returns: -1 (a < b), 0 (equal), 1 (a > b)
}
```

### How `RuleMapper.set()` Uses Specificity

```typescript
set(node, ruleName, rule: MappingLayer) {
  const currentRule = rules[ruleName];
  if (currentRule) {
    const order = compareSpecificity(currentRule.specificity, rule.specificity);
    if (order === 1) {
      return;     // Current has higher specificity → skip new rule
    }
    // order === 0 or -1 → overwrite with new rule
  }
  rules[ruleName] = rule;
}
```

- `order === 1` (current > new): **skip** — existing higher-specificity rule is preserved
- `order === 0` (equal): **overwrite** — later mapping wins
- `order === -1` (current < new): **overwrite** — higher-specificity rule wins

### Specificity Examples

```json
{
  "rules": {
    "class-naming": "/^prefix-/"
  },
  "nodeRules": [
    {
      "selector": "div",
      "rules": { "class-naming": "/^div-/" }
    },
    {
      "selector": "div.special",
      "rules": { "class-naming": "/^special-/" }
    },
    {
      "selector": "#main",
      "rules": { "class-naming": "/^main-/" }
    }
  ]
}
```

For `<div id="main" class="special">`:

| Source         | Selector      | Specificity | `class-naming` value |
| -------------- | ------------- | ----------- | -------------------- |
| `rules`        | (global)      | `[0, 0, 0]` | `/^prefix-/`         |
| `nodeRules[0]` | `div`         | `[0, 0, 1]` | `/^div-/`            |
| `nodeRules[1]` | `div.special` | `[0, 1, 1]` | `/^special-/`        |
| `nodeRules[2]` | `#main`       | `[1, 0, 0]` | `/^main-/`           |

Processing order: `rules` → `nodeRules[0]` → `nodeRules[1]` → `nodeRules[2]`

Result: `class-naming` = `/^main-/` (specificity `[1, 0, 0]` is highest)

## Merging with Global Rules

When a `nodeRules` or `childNodeRules` entry specifies a rule, the value is **merged** with the global rule configuration rather than simply replacing it:

```typescript
const globalRule = ruleset.rules[ruleName];
const mergedRule = globalRule == null ? convertedRule : mergeRule(globalRule, convertedRule);
```

`mergeRule(a, b)` (from `@markuplint/ml-config`) applies right-side precedence:

| Scenario                 | Result                                                                                             |
| ------------------------ | -------------------------------------------------------------------------------------------------- |
| `b` is `false`           | Rule is disabled (returns `false`)                                                                 |
| `b` is a primitive value | Replaces `a`'s value                                                                               |
| Both are objects         | Properties from `b` override `a`; `severity`, `value`, `options`, `reason` are individually merged |
| `b.options` exists       | Merged with `a.options` (objects are spread, arrays are concatenated)                              |
| `b.value` is not set     | Inherits from `a.value`                                                                            |

### Merging Example

```json
{
  "rules": {
    "my-rule": {
      "severity": "error",
      "value": "strict",
      "options": { "allow": ["a", "b"] }
    }
  },
  "nodeRules": [
    {
      "selector": "nav",
      "rules": {
        "my-rule": {
          "options": { "allow": ["c"] }
        }
      }
    }
  ]
}
```

For `<nav>`, `my-rule` is resolved as:

```json
{
  "severity": "error",
  "value": "strict",
  "options": { "allow": ["c"] }
}
```

`severity` and `value` are inherited from the global config. `options.allow` is overwritten by the `nodeRules` entry (object spread, not array concatenation at the `options` level — `options` itself is spread, not individual sub-properties).

## Regex Selector and Template Variables

`nodeRules` and `childNodeRules` support regex selectors, which can capture data from element attributes. Captured values are available as Mustache template variables in the rule configuration:

```json
{
  "nodeRules": [
    {
      "regexSelector": {
        "attrName": "data-prefix",
        "attrValue": "/^(?<prefix>.+)$/"
      },
      "rules": {
        "class-naming": "/^{{ prefix }}-/"
      }
    }
  ]
}
```

`exchangeValueOnRule(rule, matches.data)` renders these templates before merging.

## Data Flow Diagram

```
Config
  │
  ▼
Ruleset (rules, nodeRules, childNodeRules)
  │
  ▼
_ruleMapping(ruleset)
  │
  ├─── Layer 1: Global rules
  │    └─ For every node (including #document):
  │         ruleMapper.set(node, name, { from: 'rules', specificity: [0,0,0], rule })
  │
  ├─── Layer 2: Node rules
  │    └─ For each nodeRule entry:
  │         └─ For each ELEMENT_NODE matching the selector:
  │              ├─ exchangeValueOnRule (template rendering)
  │              ├─ mergeRule (merge with global)
  │              └─ ruleMapper.set(node, name, { from: 'nodeRules', specificity, rule })
  │
  └─── Layer 3: Child node rules
       └─ For each childNodeRule entry:
            └─ For each ELEMENT_NODE matching the selector:
                 └─ For each child (or descendant if inheritance: true):
                      ├─ exchangeValueOnRule (template rendering)
                      ├─ mergeRule (merge with global)
                      └─ ruleMapper.set(child, name, { from: 'childNodeRules', specificity, rule })
  │
  ▼
ruleMapper.apply()
  │
  └─ For each node in the map:
       node.rules[ruleName] = rule
  │
  ▼
node.rules populated → ready for walkOn() verification
```
