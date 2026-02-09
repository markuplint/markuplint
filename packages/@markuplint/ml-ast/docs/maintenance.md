# Maintenance Guide

Practical operations and maintenance guide for `@markuplint/ml-ast`.

## Commands

| Command                                       | Description                  |
| --------------------------------------------- | ---------------------------- |
| `yarn build --scope @markuplint/ml-ast`       | Compile TypeScript to `lib/` |
| `yarn workspace @markuplint/ml-ast run dev`   | Watch mode compilation       |
| `yarn workspace @markuplint/ml-ast run clean` | Clean compiled output        |

## Testing

This package has **no test files**. It is a pure type-definition package, so correctness is verified by the TypeScript compiler during build. Integration testing is performed by downstream packages that consume these types.

To verify type correctness:

```bash
yarn build --scope @markuplint/ml-ast
```

## Common Recipes

### 1. Adding a New Node Type

To add a new AST node type (e.g., a hypothetical `MLASTDirective`):

1. **Add the type value to `MLASTNodeType`** in `src/types.ts`:

   ```typescript
   export type MLASTNodeType =
     | 'doctype'
     | 'starttag'
     // ... existing values
     | 'directive'; // Add here
   ```

2. **Define the interface** extending `MLASTAbstractNode`:

   ```typescript
   export interface MLASTDirective extends MLASTAbstractNode {
     readonly type: 'directive';
     readonly depth: number;
     // Add type-specific fields
   }
   ```

3. **Add to relevant union types**:
   - `MLASTNode` -- Always add to this union
   - `MLASTChildNode` -- If it can be a child of elements
   - `MLASTNodeTreeItem` -- If it can appear at the top level of `nodeList`
   - `MLASTParentNode` -- If it can contain child nodes

4. **Update `ml-core`'s `createNode()`** in `packages/@markuplint/ml-core/src/ml-dom/helper/create-node.ts`:
   - Add a `case` for the new type value in the `switch` statement
   - Create or reuse an appropriate DOM node class

5. **Update parsers** that should produce this node type

6. **Build and verify**:
   ```bash
   yarn build --scope @markuplint/ml-ast
   yarn build --scope @markuplint/ml-core
   ```

### 2. Adding a Field to an Existing Node Type

To add a new field to an existing node interface:

1. **Add the field** to the interface in `src/types.ts`:

   ```typescript
   export interface MLASTElement extends MLASTAbstractNode {
     // ... existing fields
     readonly newField: string; // Required field
     readonly optionalField?: boolean; // Optional field (prefer for backward compat)
   }
   ```

2. **Prefer optional fields** (`?`) for backward compatibility -- existing parsers will not break if the field is missing.

3. **Update parsers** that should populate the new field.

4. **Update `ml-core`** if the field affects DOM node creation or behavior.

5. **Build the full chain**:
   ```bash
   yarn build --scope @markuplint/ml-ast
   yarn build --scope @markuplint/ml-core
   ```

### 3. Adding a New Attribute Variant

To add a new attribute type alongside `MLASTHTMLAttr` and `MLASTSpreadAttr`:

1. **Add the type value to `MLASTNodeType`** (if not already present)

2. **Define the interface** extending `MLASTToken`:

   ```typescript
   export interface MLASTNewAttr extends MLASTToken {
     readonly type: 'newattr';
     readonly nodeName: string;
     // Add attribute-specific fields
   }
   ```

3. **Add to `MLASTAttr` union**:

   ```typescript
   export type MLASTAttr = MLASTHTMLAttr | MLASTSpreadAttr | MLASTNewAttr;
   ```

4. **Update downstream consumers** that switch on attribute types

5. **Build and verify**

### 4. Adding a `PreprocessorSpecificBlockConditionalType` Value

To add a new conditional type value for preprocessor blocks:

1. **Add the value** to `MLASTPreprocessorSpecificBlockConditionalType` in `src/types.ts`:

   ```typescript
   export type MLASTPreprocessorSpecificBlockConditionalType =
     | 'if'
     | 'if:elseif'
     // ... existing values
     | 'newvalue' // Add here
     | null;
   ```

2. **Update the parser** that produces blocks with this conditional type

3. **Update `ml-core`** if the new value requires special handling during DOM creation

4. **Build and verify**:
   ```bash
   yarn build --scope @markuplint/ml-ast
   ```

### 5. Modifying the `MLParser` Interface

When changing the parser interface:

1. **Make changes** to `MLParser` in `src/types.ts`

2. **Consider backward compatibility**:
   - Adding optional fields is safe
   - Adding required fields or changing signatures is a breaking change
   - Update `MLMarkupLanguageParser` (deprecated) if needed for consistency

3. **Update all parser implementations**:
   - `@markuplint/html-parser`
   - `@markuplint/jsx-parser`
   - `@markuplint/vue-parser`
   - `@markuplint/svelte-parser`
   - `@markuplint/astro-parser`
   - `@markuplint/pug-parser`
   - `@markuplint/parser-utils`

4. **Build all affected packages**:
   ```bash
   yarn build
   ```

## Downstream Impact Checklist

When modifying types in this package, verify that these downstream packages still build and pass tests:

- [ ] `@markuplint/html-parser` -- HTML parser
- [ ] `@markuplint/parser-utils` -- Parser utility functions
- [ ] `@markuplint/jsx-parser` -- JSX parser
- [ ] `@markuplint/astro-parser` -- Astro parser
- [ ] `@markuplint/vue-parser` -- Vue SFC parser
- [ ] `@markuplint/svelte-parser` -- Svelte parser
- [ ] `@markuplint/pug-parser` -- Pug parser
- [ ] `@markuplint/ml-core` -- Core DOM mapping (most critical)
- [ ] `@markuplint/ml-config` -- Configuration types
- [ ] `@markuplint/ml-spec` -- Specification types
- [ ] `@markuplint/file-resolver` -- File resolution

The most critical downstream package is `@markuplint/ml-core`, which contains `createNode()` -- the function that maps AST nodes to DOM nodes via a `switch` statement on `node.type`.

## Troubleshooting

### Build Errors After Type Changes

**Symptom:** Downstream packages fail to build after modifying types.

**Diagnosis:**

1. Build this package first: `yarn build --scope @markuplint/ml-ast`
2. Build `ml-core` next: `yarn build --scope @markuplint/ml-core`
3. Check for `switch` exhaustiveness errors -- TypeScript will report if a `switch` on `node.type` is missing a case for a new type value
4. Check for union type mismatches -- adding a type to a union may cause existing narrowing code to need updates

### Missing Case in ml-core's `createNode()`

**Symptom:** `TypeError: Invalid AST node types "newtype"` at runtime.

**Cause:** A new node type was added to `MLASTNodeType` and the relevant union types, but `ml-core`'s `createNode()` switch statement was not updated.

**Fix:** Add a `case` for the new type in `packages/@markuplint/ml-core/src/ml-dom/helper/create-node.ts`.

### Parser Not Producing Expected Nodes

**Symptom:** A parser does not produce nodes with newly added fields or types.

**Diagnosis:**

1. Check that the parser implementation has been updated to populate new fields
2. For optional fields, verify that the field is not silently `undefined`
3. Build both the parser and this package to ensure type alignment
