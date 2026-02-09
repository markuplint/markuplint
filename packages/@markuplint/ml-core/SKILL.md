---
description: Maintenance tasks for @markuplint/ml-core — the core linting engine with MLDOM, MLRule, and MLCore subsystems
globs:
  - packages/@markuplint/ml-core/src/**/*.ts
  - packages/@markuplint/ml-core/tsconfig*.json
  - packages/@markuplint/ml-core/package.json
alwaysApply: false
---

# @markuplint/ml-core Maintenance

You are maintaining `@markuplint/ml-core`, the core linting engine of markuplint.

## Architecture

Read [ARCHITECTURE.md](ARCHITECTURE.md) for the full package overview, MLDOM class hierarchy, rule system, and linting pipeline.

## Tasks

### add-node-property

Add a property to an MLDOM node class.

1. Identify the target class in `src/ml-dom/node/` (e.g., `element.ts`, `node.ts`, `document.ts`)
2. Add the property as a getter or readonly field
3. Use `this.#astNode` for AST-derived data, `this.ownerMLDocument.specs` for spec data
4. Update type definitions in `src/ml-dom/node/types.ts` if needed
5. Build: `yarn build --scope @markuplint/ml-core`
6. Check downstream impact on `@markuplint/rules`

### create-rule

Create a new linting rule using the `createRule` API.

1. Rules are implemented in `@markuplint/rules`, not in this package
2. Use `createRule()` from `src/ml-rule/create-rule.ts` for the rule seed
3. Define `verify()` and optionally `fix()` in the `RuleSeed`
4. Use `document.walkOn(type, walker)` to iterate target nodes
5. Use `context.report()` to report violations
6. Test with `createTestDocument()` and `createTestElement()` from `src/test/index.ts`

### modify-rule-mapping

Change how rules are mapped to nodes via RuleMapper.

1. Open `src/ml-dom/node/rule-mapper.ts`
2. `apply()` iterates through global rules, nodeRules, and childNodeRules
3. `MappingLayer` includes `from`, `specificity`, and the resolved `rule`
4. `set()` assigns layers to nodes, resolving conflicts by CSS selector specificity
5. Build and verify: `yarn build --scope @markuplint/ml-core`
6. Test rule resolution with `createTestDocument` using nodeRules/childNodeRules config

### update-pretender

Update the pretender system for component-to-HTML element mapping.

1. Pretender initialization is in `MLDocument` constructor (`src/ml-dom/node/document.ts`)
2. `PretenderContext` types are in `src/ml-dom/node/types.ts`
3. Elements matching pretender selectors get `pretenderContext` with `type: 'pretender'`
4. Accessibility name computation uses pretender context (`src/ml-dom/helper/accname.ts`)
5. Test with `createTestDocument(source, { pretenders: [...] })`
