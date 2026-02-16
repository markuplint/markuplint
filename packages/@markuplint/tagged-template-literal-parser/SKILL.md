---
description: Maintenance tasks for @markuplint/tagged-template-literal-parser
globs:
  - packages/@markuplint/tagged-template-literal-parser/src/**/*.ts
alwaysApply: false
---

# @markuplint/tagged-template-literal-parser Maintenance

You are maintaining `@markuplint/tagged-template-literal-parser`, the tagged template literal parser for markuplint.

## Architecture

See [ARCHITECTURE.md](ARCHITECTURE.md) for the full architecture overview including the two-stage parsing pipeline and integration points.

For detailed maintenance procedures, see [docs/maintenance.md](docs/maintenance.md) ([Japanese](docs/maintenance.ja.md)).

## Key Files

| File                            | Role                                                      |
| ------------------------------- | --------------------------------------------------------- |
| `src/parser.ts`                 | TaggedTemplateLiteralParser class extending HtmlParser    |
| `src/find-template-literals.ts` | TypeScript AST traversal to find tagged template literals |
| `src/index.ts`                  | Package entry point; re-exports parser and class          |

## Tasks

### add-tag-name

Add support for a new tag function name (e.g., `svg`, `css`).

1. The default parser instance in `src/parser.ts` is configured with `['html']`
2. To add more default tags, modify the constructor default: `tagNames: readonly string[] = ['html', 'svg']`
3. Add a test in `src/find-template-literals.spec.ts` to verify the new tag is recognized
4. Add an integration test in `src/index.spec.ts` to verify HTML is correctly parsed from the new tag
5. Build: `yarn build --scope @markuplint/tagged-template-literal-parser`
6. Test: `npx vitest run packages/@markuplint/tagged-template-literal-parser/src/`

### modify-expression-handling

Modify how `${...}` expressions are handled (e.g., changing the PSBlock type name).

1. Open `src/parser.ts` and modify the `ignoreTags` entry in the constructor
2. Update the `type` field to change the PSBlock node name (currently `ttl-expression`)
3. Update all affected test assertions in `src/index.spec.ts` (search for `#ps:ttl-expression`)
4. Build: `yarn build --scope @markuplint/tagged-template-literal-parser`
5. Test: `npx vitest run packages/@markuplint/tagged-template-literal-parser/src/`

### add-tag-resolution-pattern

Add support for a new tag expression form (e.g., call expressions like `html(options)\`...\``).

1. Open `src/find-template-literals.ts`
2. Add a new case to `resolveTagName()` for the expression type
3. Add a test in `src/find-template-literals.spec.ts` to verify the tag is resolved
4. Add an integration test in `src/index.spec.ts`
5. Build and test as above
