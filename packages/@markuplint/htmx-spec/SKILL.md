---
description: Maintenance tasks for @markuplint/htmx-spec
globs:
  - packages/@markuplint/htmx-spec/src/**/*.ts
alwaysApply: false
---

# htmx-spec-maintenance

Perform maintenance tasks for `@markuplint/htmx-spec`: add global attributes
and modify the ExtendedSpec object.

## Input

`$ARGUMENTS` specifies the task. Supported tasks:

| Task                   | Description                                    |
| ---------------------- | ---------------------------------------------- |
| `add-global-attribute` | Add a new global attribute to the ExtendedSpec |

If omitted, defaults to `add-global-attribute`.

## Reference

Before executing any task, read `docs/maintenance.md` (or `docs/maintenance.ja.md`)
for the full guide. The recipes there are the source of truth for procedures.

Also read:

- `ARCHITECTURE.md` -- Package overview, ExtendedSpec content, and integration points
- `src/index.ts` -- ExtendedSpec object definition (source of truth)

## Task: add-global-attribute

Add a new global htmx attribute available on every HTML element. Follow recipe #1 in `docs/maintenance.md`.

### Step 1: Identify the attribute

1. Determine the attribute name, type (`Any`, `Boolean`, or a specific type), and description
2. Check the htmx documentation to confirm the attribute is valid

### Step 2: Add the attribute

1. Read `src/index.ts`
2. Add a new entry under `def['#globalAttrs']['#extends']`:
   ```ts
   'hx-attributeName': {
       type: 'Any', // or 'Boolean'
   },
   ```
3. Add a JSDoc comment above the entry describing its purpose

### Step 3: Verify

1. Build: `yarn build --scope @markuplint/htmx-spec`
2. Confirm the attribute appears in the exported spec object

## Rules

1. **Only export an ExtendedSpec object** -- this package contains no parsing logic.
2. **All htmx attributes are global** -- they go under `def['#globalAttrs']['#extends']`.
3. **htmx attributes are prefixed with `hx-`** -- follow this naming convention.
4. **Each attribute needs at minimum a `type` field** -- valid types include `Any`, `Boolean`, and specific type strings.
5. **Add JSDoc comments** to all new attribute entries describing their purpose.
