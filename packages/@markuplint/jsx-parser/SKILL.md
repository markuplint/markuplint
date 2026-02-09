---
description: Maintenance tasks for @markuplint/jsx-parser
globs:
  - packages/@markuplint/jsx-parser/src/**/*.ts
alwaysApply: false
---

# jsx-parser-maintenance

Perform maintenance tasks for `@markuplint/jsx-parser`: add IDL attribute mappings,
handle new JSX/TypeScript AST node types, and modify element type detection.

## Input

`$ARGUMENTS` specifies the task. Supported tasks:

| Task                            | Description                                              |
| ------------------------------- | -------------------------------------------------------- |
| `add-idl-attribute-mapping`     | Add a new IDL-to-content attribute mapping               |
| `add-jsx-node-type-handling`    | Handle a new AST node type in recursiveSearchJSXElements |
| `modify-element-type-detection` | Modify the element type detection regex                  |

If omitted, defaults to `add-jsx-node-type-handling`.

## Reference

Before executing any task, read `docs/maintenance.md` (or `docs/maintenance.ja.md`)
for the full guide. The recipes there are the source of truth for procedures.

Also read:

- `ARCHITECTURE.md` -- Package overview, JSX AST extraction, nodeize dispatch, and attribute processing
- `src/parser.ts` -- JSXParser class (source of truth for override methods)
- `src/jsx.ts` -- JSX AST extraction utilities (source of truth for recursiveSearchJSXElements)

## Task: add-idl-attribute-mapping

Add a new IDL-to-content attribute mapping for JSX. Follow recipe #1 in `docs/maintenance.md`.

### Step 1: Add the mapping

1. Read `@markuplint/parser-utils/src/idl-attributes.ts`
2. Add the new entry to the `idlContentMap` object (key = IDL property name, value = content attribute name)
3. The `searchIDLAttribute()` function will automatically pick up the new mapping

### Step 2: Verify

1. Build: `yarn build --scope @markuplint/parser-utils --scope @markuplint/jsx-parser`
2. Add a test case in `src/index.spec.ts` using `attributesToDebugMaps` to verify the `potentialName` is set correctly
3. Test: `yarn test --scope @markuplint/jsx-parser`

## Task: add-jsx-node-type-handling

Handle a new AST node type in `recursiveSearchJSXElements()`. Follow recipe #2 in `docs/maintenance.md`.

### Step 1: Identify the new node type

1. Read `src/jsx.ts` and locate the `recursiveSearchJSXElements()` function
2. Identify the new `AST_NODE_TYPES` value from `@typescript-eslint/types`
3. Determine which properties of the node may contain JSX (check the TSESTree type definition)

### Step 2: Add the case

1. Add a new `case AST_NODE_TYPES.NewType:` in the appropriate position within the switch
2. Recurse into the properties that can contain JSX elements:
   - Array properties: `recursiveSearchJSXElements(node.someArray, parentId)`
   - Nullable single properties: `recursiveSearchJSXElements([node.someProp ?? null], parentId)`
3. End with `continue;`

### Step 3: Verify

1. Build: `yarn build --scope @markuplint/jsx-parser`
2. Add a test case in `src/index.spec.ts` with source code that uses the new syntax
3. Test: `yarn test --scope @markuplint/jsx-parser`

## Task: modify-element-type-detection

Modify the element type detection regex. Follow recipe #3 in `docs/maintenance.md`.

### Step 1: Understand the current regex

1. Read `src/parser.ts` and locate the `detectElementType()` method
2. The current regex is `/^[A-Z]|\./` (uppercase start = component, dot = member expression)

### Step 2: Modify the regex

1. Update the regex pattern passed to `super.detectElementType(nodeName, pattern)`
2. Consider the three element types: `html`, `authored`, `web-component`

### Step 3: Verify

1. Build: `yarn build --scope @markuplint/jsx-parser`
2. Update the `isCustomElement` test in `src/index.spec.ts`
3. Test: `yarn test --scope @markuplint/jsx-parser`

## Rules

1. **Use `@typescript-eslint/typescript-estree` for parsing** -- never use a custom JSX parser or regex-based approach.
2. **Use `searchIDLAttribute()` for attribute mapping** -- IDL-to-content attribute mappings live in `@markuplint/parser-utils`, not in this package.
3. **Test with `nodeListToDebugMaps`** -- all integration tests use this pattern for snapshot-style assertions.
4. **Handle all AST node types exhaustively** -- `recursiveSearchJSXElements()` must handle every `AST_NODE_TYPES` value; unhandled types throw `'Unsupported node'`.
5. **Preserve `#parentIdMap` tracking** -- every nodeize branch must register created nodes in the WeakMap for correct parent-child rebuilding.
6. **Add JSDoc comments** to all new public methods and properties.
