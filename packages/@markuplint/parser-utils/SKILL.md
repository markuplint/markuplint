---
description: Perform maintenance tasks for @markuplint/parser-utils
---

# parser-utils-maintenance

Perform maintenance tasks for `@markuplint/parser-utils`: create new parsers,
add ignore tag patterns, add IDL attribute mappings, and customize attribute parsing.

## Input

`$ARGUMENTS` specifies the task. Supported tasks:

| Task                       | Description                                |
| -------------------------- | ------------------------------------------ |
| `create-parser`            | Create a new parser extending Parser class |
| `add-ignore-tag <type>`    | Add an IgnoreTag pattern                   |
| `add-idl-attribute <name>` | Add an IDL attribute mapping               |
| `customize-attr-parsing`   | Customize attribute parsing behavior       |

If omitted, defaults to `create-parser`.

## Reference

Before executing any task, read `docs/maintenance.md` (or `docs/maintenance.ja.md`)
for the full guide. The recipes there are the source of truth for procedures.

Also read:

- `docs/parser-class.md` -- Complete Parser class reference with override patterns
- `ARCHITECTURE.md` -- Package overview, module relationships, and integration points

## Task: create-parser

Create a new parser extending the abstract Parser class. Follow recipe #1 in `docs/maintenance.md`.

### Step 1: Set up the package

1. Create a new package under `packages/@markuplint/`
2. Add `@markuplint/parser-utils` as a dependency
3. Create the main parser file extending `Parser<YourNode, YourState>`

### Step 2: Implement required methods

1. Read `docs/parser-class.md` for the full override pattern reference
2. Implement `tokenize()` -- invoke the language-specific tokenizer on `this.rawCode`
3. Implement `nodeize()` -- convert each AST node using visitor methods
4. Set constructor options (`endTagType`, `tagNameCaseSensitive`, `ignoreTags`, etc.)

### Step 3: Export the parser module

1. Export as `MLParserModule`: `export default { parser: new MyParser() }`
2. Build: `yarn build --scope @markuplint/<package-name>`
3. Test with `nodeListToDebugMaps` snapshot assertions

## Task: add-ignore-tag

Add an IgnoreTag pattern for masking template expressions. Follow recipe #3 in `docs/maintenance.md`.

### Step 1: Define the pattern

1. Identify the start and end delimiters of the template expression
2. Choose a `type` name (becomes the `#ps:` node name prefix)
3. Start and end can be strings or RegExp patterns

### Step 2: Add to constructor

1. Add the `IgnoreTag` entry to the `ignoreTags` array in the parser constructor
2. Consider if a custom `maskChar` is needed (default is `\uE000`)

### Step 3: Verify

1. Build: `yarn build --scope @markuplint/<package-name>`
2. Test that the template expression is correctly masked and restored
3. Verify the restored node has the expected `#ps:<type>` name

## Task: add-idl-attribute

Add an IDL attribute mapping. Follow recipe #5 in `docs/maintenance.md`.

### Step 1: Add the mapping

1. Read `src/idl-attributes.ts` and find the `idlContentMap` object
2. Add a new entry: `idlPropName: 'content-attr-name'`
3. Follow naming conventions: key is camelCase IDL name, value is lowercase content name

### Step 2: Verify

1. Build: `yarn build --scope @markuplint/parser-utils`
2. Test with `searchIDLAttribute()` to confirm the mapping resolves correctly

## Task: customize-attr-parsing

Customize attribute parsing behavior for a specific parser. Follow recipe #4 in `docs/maintenance.md`.

### Step 1: Override visitAttr

1. Read `docs/parser-class.md` for the `visitAttr()` documentation
2. Override `visitAttr()` in your parser subclass
3. Call `super.visitAttr(token, options)` with custom options:
   - `quoteSet` -- custom quote delimiters (e.g., `{` `}` for JSX)
   - `startState` -- initial AttrState (usually `BeforeName`)
   - `noQuoteValueType` -- value type for unquoted values

### Step 2: Post-process

1. After calling `super`, use `this.updateAttr()` to set metadata:
   - `isDirective` for framework directives
   - `isDynamicValue` for dynamic bindings
   - `potentialName` for directive-to-attribute name resolution
2. Use `searchIDLAttribute()` to resolve IDL property names

### Step 3: Verify

1. Build the parser package
2. Test attribute parsing with `attributesToDebugMaps` for snapshot assertions
3. Verify all framework-specific directive patterns are recognized

## Rules

1. **Always call `super.visitAttr()`** when overriding. It handles token decomposition.
2. **Always call `super.detectElementType()`** when overriding. Pass framework-specific patterns as the `defaultPattern` argument.
3. **Never call `super.tokenize()` or `super.nodeize()`** -- the defaults return empty arrays.
4. **Always call `super.beforeParse()` and `super.afterParse()`** -- they handle offset spaces.
5. **Test across all downstream parsers** when modifying the Parser class.
6. **Add JSDoc comments** to all new public methods and properties.
