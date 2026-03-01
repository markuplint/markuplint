---
description: Maintenance tasks for @markuplint/datastar-spec
globs:
  - packages/@markuplint/datastar-spec/src/**/*.ts
alwaysApply: false
---

# datastar-spec-maintenance

Perform maintenance tasks for `@markuplint/datastar-spec`: add global attributes
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

Add a new global Datastar attribute available on every HTML element. Follow recipe #1 in `docs/maintenance.md`.

### Step 1: Identify the attribute

1. Determine the attribute name, type (`Any`, `Boolean`, or a specific type), and description
2. Check the Datastar documentation to confirm the attribute is valid

### Step 2: Add the attribute

1. Read `src/index.ts`
2. Add a new entry under `def['#globalAttrs']['#extends']`:
   ```ts
   'data-attributeName': {
       type: 'Any', // or 'Boolean'
   },
   ```
3. Add a JSDoc comment above the entry describing its purpose

### Step 3: Verify

1. Build: `yarn build --scope @markuplint/datastar-spec`
2. Confirm the attribute appears in the exported spec object

## Rules

1. **Only export an ExtendedSpec object** -- this package contains no parsing logic.
2. **All Datastar attributes are global** -- they go under `def['#globalAttrs']['#extends']`.
3. **Datastar attributes are prefixed with `data-`** -- follow this naming convention.
4. **Each attribute needs at minimum a `type` field** -- valid types include `Any`, `Boolean`, and specific type strings.
5. **Add JSDoc comments** to all new attribute entries describing their purpose.
