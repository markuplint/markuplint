---
description: Perform maintenance tasks for @markuplint/ml-ast
---

# ml-ast-maintenance

Perform maintenance tasks for `@markuplint/ml-ast`: add AST node types,
add fields to existing nodes, add conditional type values, and update the parser interface.

## Input

`$ARGUMENTS` specifies the task. Supported tasks:

| Task                           | Description                                    |
| ------------------------------ | ---------------------------------------------- |
| `add-node-type <name>`         | Add a new AST node type                        |
| `add-field <node> <field>`     | Add a field to an existing node type           |
| `add-conditional-type <value>` | Add a conditional type value for psblock nodes |
| `update-parser-interface`      | Modify the MLParser interface                  |

If omitted, defaults to `add-node-type`.

## Reference

Before executing any task, read `docs/maintenance.md` (or `docs/maintenance.ja.md`)
for the full guide. The recipes there are the source of truth for procedures.

Also read:

- `docs/node-reference.md` -- Detailed documentation of each AST node type
- `ARCHITECTURE.md` -- Package overview, type hierarchy, and integration points

## Task: add-node-type

Add a new AST node type. Follow recipe #1 in `docs/maintenance.md`.

### Step 1: Define the type

1. Read `src/types.ts` to understand the existing type hierarchy
2. Add the type value to `MLASTNodeType`
3. Define the interface extending `MLASTAbstractNode`
4. Add to relevant union types (`MLASTNode`, `MLASTChildNode`, etc.)

### Step 2: Update downstream

1. Update `ml-core`'s `createNode()` in `packages/@markuplint/ml-core/src/ml-dom/helper/create-node.ts`
2. Add a `case` for the new type value in the `switch` statement
3. Create or reuse an appropriate DOM node class

### Step 3: Build and verify

1. Build: `yarn build --scope @markuplint/ml-ast`
2. Build: `yarn build --scope @markuplint/ml-core`
3. Check the downstream impact checklist in `docs/maintenance.md`

## Task: add-field

Add a field to an existing node type. Follow recipe #2 in `docs/maintenance.md`.

### Step 1: Add the field

1. Read `src/types.ts` and find the target interface
2. Add the field (prefer optional `?` for backward compatibility)
3. Add JSDoc documentation for the new field

### Step 2: Update consumers

1. Update parsers that should populate the new field
2. Update `ml-core` if the field affects DOM node creation

### Step 3: Build and verify

1. Build: `yarn build --scope @markuplint/ml-ast`
2. Build affected packages
3. Check the downstream impact checklist in `docs/maintenance.md`

## Task: add-conditional-type

Add a conditional type value for preprocessor-specific blocks. Follow recipe #4 in `docs/maintenance.md`.

### Step 1: Add the value

1. Read `src/types.ts` and find `MLASTPreprocessorSpecificBlockConditionalType`
2. Add the new value to the union type
3. Document the value's semantic meaning in the JSDoc comment

### Step 2: Update parsers

1. Update the parser that produces blocks with this conditional type
2. Verify the value follows the naming convention (`category:variant`, e.g., `if:elseif`)

### Step 3: Build and verify

1. Build: `yarn build --scope @markuplint/ml-ast`
2. Build the affected parser package

## Task: update-parser-interface

Modify the `MLParser` interface. Follow recipe #5 in `docs/maintenance.md`.

### Step 1: Make changes

1. Read `src/types.ts` and find `MLParser`
2. Make changes (prefer adding optional fields for backward compatibility)
3. Update `MLMarkupLanguageParser` (deprecated) if needed for consistency

### Step 2: Update all parsers

1. Update all parser implementations (see the list in `docs/maintenance.md` recipe #5)
2. Update `@markuplint/parser-utils` if it provides shared implementation

### Step 3: Build and verify

1. Build all packages: `yarn build`
2. Run all tests: `yarn test`

## Rules

1. **All node types extend `MLASTAbstractNode`** (except attributes which extend `MLASTToken`).
2. **Use `readonly` for all interface fields.** The AST is immutable after parsing.
3. **Prefer optional fields** when adding to existing interfaces for backward compatibility.
4. **Always update `createNode()` in `ml-core`** when adding new node types.
5. **Follow the discriminated union pattern.** Every node must have a unique `type` literal value.
6. **Add JSDoc comments** to all new exported types and fields.
