---
description: Maintenance tasks for @markuplint/svelte-spec
globs:
  - packages/@markuplint/svelte-spec/src/**/*.ts
alwaysApply: false
---

# svelte-spec-maintenance

Perform maintenance tasks for `@markuplint/svelte-spec`: add global attributes,
add element-specific attribute overrides for Svelte components.

## Input

`$ARGUMENTS` specifies the task. Supported tasks:

| Task                   | Description                                |
| ---------------------- | ------------------------------------------ |
| `add-global-attribute` | Add a new global attribute for Svelte      |
| `add-element-override` | Add an element-specific attribute override |

If omitted, defaults to `add-element-override`.

## Reference

Before executing any task, read `docs/maintenance.md` (or `docs/maintenance.ja.md`)
for the full guide. The recipes there are the source of truth for procedures.

Also read:

- `ARCHITECTURE.md` -- Package overview, ExtendedSpec content, and integration points
- `src/index.ts` -- The single source file (source of truth for the spec object)

## Task: add-global-attribute

Add a new global attribute that applies to all Svelte elements. Follow recipe #1 in `docs/maintenance.md`.

### Step 1: Read the current spec

1. Read `src/index.ts` to understand the current `ExtendedSpec` structure
2. Check if a `def` property with `#globalAttrs` already exists

### Step 2: Add the global attribute

1. If `def` does not exist, add it to the spec object:
   ```ts
   def: {
     '#globalAttrs': {
       '#extends': {
         'attribute-name': {
           type: 'Any',
         },
       },
     },
   },
   ```
2. If `def['#globalAttrs']['#extends']` already exists, add the new attribute to it

### Step 3: Verify

1. Build: `yarn build --scope @markuplint/svelte-spec`
2. Test: `yarn test --scope @markuplint/svelte-spec`

## Task: add-element-override

Add an element-specific attribute override. Follow recipe #2 in `docs/maintenance.md`.

### Step 1: Read the current spec

1. Read `src/index.ts` to understand the current `specs` array
2. Check if the target element already has an entry

### Step 2: Add the override

1. If the element already exists in `specs`, add the new attribute to its `attributes` object
2. If the element does not exist, add a new entry to the `specs` array:
   ```ts
   {
     name: 'element-name',
     attributes: {
       'attribute-name': {
         type: 'Any',
       },
     },
   },
   ```

### Step 3: Verify

1. Build: `yarn build --scope @markuplint/svelte-spec`
2. Test: `yarn test --scope @markuplint/svelte-spec`

## Rules

1. **Only export an `ExtendedSpec` object** -- this package must not contain any parsing logic.
2. **Global attributes go under `def['#globalAttrs']['#extends']`** -- not in the `specs` array.
3. **Element overrides go under the `specs[]` array** -- each entry needs a `name` and `attributes` object.
4. **Each attribute needs at minimum a `type` field** -- common values are `Any`, `String`, `Boolean`, or an enum object.
5. **Add JSDoc comments** to any new attribute definitions explaining why the override is needed.
