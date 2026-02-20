# Maintenance Guide

## Commands

| Command                                     | Description            |
| ------------------------------------------- | ---------------------- |
| `yarn build --scope @markuplint/jsx-parser` | Build this package     |
| `yarn dev --scope @markuplint/jsx-parser`   | Watch mode build       |
| `yarn clean --scope @markuplint/jsx-parser` | Remove build artifacts |
| `yarn test --scope @markuplint/jsx-parser`  | Run tests              |

## Testing

Test files follow the `*.spec.ts` naming convention and are located in the `src/` directory:

| Test File       | Coverage                                                                                                         |
| --------------- | ---------------------------------------------------------------------------------------------------------------- |
| `index.spec.ts` | JSXParser integration tests (parsing JSX/TSX, attributes, namespaces, element types, parent-child relationships) |
| `jsx.spec.ts`   | JSX extraction utility tests (spread attribute detection, comment extraction, getName resolution)                |

The primary testing pattern uses `nodeListToDebugMaps` for snapshot-style assertions:

```ts
import { nodeListToDebugMaps } from '@markuplint/parser-utils';
import { parser } from './parser.js';

const ast = parser.parse('<div className="foo">text</div>');
const maps = nodeListToDebugMaps(ast.nodeList);
expect(maps).toStrictEqual([
  // expected debug output
]);
```

For attribute testing, use `attributesToDebugMaps`:

```ts
import { attributesToDebugMaps } from '@markuplint/parser-utils';

const ast = parser.parse('<Component className="foo" />');
// @ts-ignore
const attrMaps = attributesToDebugMaps(ast.nodeList[0].attributes);
expect(attrMaps).toStrictEqual([
  // expected attribute debug output
]);
```

## Recipes

### 1. Adding a New IDL Attribute Mapping

1. Read `@markuplint/parser-utils/src/idl-attributes.ts`
2. Add the new entry to the `idlContentMap` object:
   - Key: the IDL property name (camelCase, e.g., `className`)
   - Value: the content attribute name (lowercase/hyphenated, e.g., `class`)
3. Build: `yarn build --scope @markuplint/parser-utils --scope @markuplint/jsx-parser`
4. Add a test in `src/index.spec.ts` using `attributesToDebugMaps` to verify:
   - `potentialName` is set to the content attribute name
   - `candidate` is set if the raw name differs from the IDL property name
5. Test: `yarn test --scope @markuplint/jsx-parser`

### 2. Handling a New AST Node Type

When `@typescript-eslint` introduces a new `AST_NODE_TYPES` value:

1. Read `src/jsx.ts` and locate the `recursiveSearchJSXElements()` switch statement
2. Determine which properties of the new node type can contain JSX:
   - Check the `TSESTree` type definition in `@typescript-eslint/types`
   - Look at the node's properties for arrays or nullable references that may contain JSX elements
3. Add a new `case` in the switch statement:
   - For leaf nodes that cannot contain JSX: add to the existing `continue` block
   - For nodes with child arrays: `jsxList.push(...recursiveSearchJSXElements(node.someArray, parentId));`
   - For nodes with nullable children: `jsxList.push(...recursiveSearchJSXElements([node.child ?? null], parentId));`
4. Build: `yarn build --scope @markuplint/jsx-parser`
5. Add a test in `src/index.spec.ts` with source code that exercises the new syntax
6. Test: `yarn test --scope @markuplint/jsx-parser`

### 3. Modifying Element Type Detection

1. Read `src/parser.ts` and locate the `detectElementType()` method
2. The current regex `/^[A-Z]|\./` classifies:
   - Uppercase start or dot → `authored` (React components, member expressions)
   - `x-` prefix → `web-component` (handled by base class)
   - All other lowercase → `html`
3. Modify the regex or add conditional logic before calling `super.detectElementType()`
4. Build: `yarn build --scope @markuplint/jsx-parser`
5. Update the `isCustomElement` test in `src/index.spec.ts`
6. Test: `yarn test --scope @markuplint/jsx-parser`

### 4. Modifying Comment Masking

1. Read `src/parser.ts` and locate the comment masking logic in the `JSXElement`/`JSXFragment` branch of `nodeize()`
2. The masking replaces comment characters with spaces while preserving newlines: `commentToken.raw.replaceAll(/[^\n]/g, ' ')`
3. Make changes, ensuring:
   - The masked token preserves line boundaries (newlines must remain)
   - The replacement maintains the same string length (offset positions depend on it)
   - Comments outside the opening tag range are skipped
4. Build: `yarn build --scope @markuplint/jsx-parser`
5. Test the "Comment in element" test case in `src/index.spec.ts`
6. Test: `yarn test --scope @markuplint/jsx-parser`

### 5. Modifying afterTraverse Parent-Child Rebuilding

1. Read `src/parser.ts` and locate the `afterTraverse()` method
2. Understand the algorithm:
   - Walks all `psblock` nodes in the tree
   - For each psblock, finds orphan nodes with the same `__parentId`
   - Appends matching orphans as children of the psblock
3. Make changes, paying attention to:
   - The `#parentIdMap` WeakMap must be populated during `nodeize()` for all node types
   - Depth must be updated to `psBlockNode.depth + 1` when appending children
   - Doctype nodes are explicitly excluded from adoption
4. Build: `yarn build --scope @markuplint/jsx-parser`
5. Test the "Parent-child relationship" tests in `src/index.spec.ts`
6. Test: `yarn test --scope @markuplint/jsx-parser`

## Upstream Impact Checklist

Changes to upstream packages can affect this parser:

| Package                    | Impact on jsx-parser              |
| -------------------------- | --------------------------------- |
| `@markuplint/parser-utils` | `Parser` base class changes       |
| `@markuplint/html-parser`  | `getNamespace()` behavior changes |
| `@markuplint/ml-ast`       | AST type definition changes       |

When upstream packages are updated, run:

```shell
yarn test --scope @markuplint/jsx-parser
```

## Troubleshooting

### "Unsupported node" error during parsing

**Symptom:** Parsing fails with `Error: Unsupported node` on valid JSX/TSX code.

**Cause:** The `recursiveSearchJSXElements()` function in `jsx.ts` does not handle a new `AST_NODE_TYPES` value introduced by a `@typescript-eslint` update.

**Solution:**

1. Check which `AST_NODE_TYPES` value is not handled (look at the stack trace)
2. Add a new `case` in the switch statement in `recursiveSearchJSXElements()`
3. See Recipe #2 above for details

### IDL attribute not being mapped correctly

**Symptom:** A JSX attribute like `className` does not get `potentialName: class` in the AST output.

**Cause:** The attribute is not in the `idlContentMap` in `@markuplint/parser-utils/src/idl-attributes.ts`, or `@markuplint/react-spec` does not set `useIDLAttributeNames: true`.

**Solution:**

1. Check `@markuplint/parser-utils/src/idl-attributes.ts` for the mapping
2. Verify the attribute name casing matches the IDL property name
3. See Recipe #1 above for adding new mappings

### Comments inside JSX tags cause parse errors

**Symptom:** JSX elements with comments inside the opening tag (e.g., `<div /* comment */ attr="value" />`) produce incorrect attribute parsing.

**Cause:** The comment masking in `nodeize()` is not correctly replacing the comment text with spaces.

**Solution:**

1. Check the comment masking logic in the `JSXElement`/`JSXFragment` branch of `nodeize()`
2. Verify that `comment.range` is correctly compared against `openTag.range`
3. Ensure the replacement preserves newlines and maintains string length

### Parent-child relationships are incorrect for expression containers

**Symptom:** Nodes inside `{expression}` containers are not correctly nested as children of the expression container in the AST.

**Cause:** The `#parentIdMap` is not being populated correctly during `nodeize()`, or the `afterTraverse()` matching logic has a bug.

**Solution:**

1. Check that all branches in `nodeize()` register nodes in `#parentIdMap` with `originNode.__parentId`
2. Check that `recursiveSearchJSXElements()` correctly assigns `__parentId` values
3. Verify the `afterTraverse()` matching: `nParentId === dParentId` comparison
