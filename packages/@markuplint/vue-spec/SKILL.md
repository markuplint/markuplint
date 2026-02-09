---
description: Maintenance tasks for @markuplint/vue-spec
globs:
  - packages/@markuplint/vue-spec/src/**/*.ts
alwaysApply: false
---

# vue-spec-maintenance

Perform maintenance tasks for `@markuplint/vue-spec`: add global attributes,
add element-specific overrides, and update Vue extended specifications.

## Input

`$ARGUMENTS` specifies the task. Supported tasks:

| Task                   | Description                                |
| ---------------------- | ------------------------------------------ |
| `add-global-attribute` | Add a new Vue global attribute             |
| `add-element-override` | Add an element-specific attribute override |

If omitted, defaults to `add-global-attribute`.

## Reference

Before executing any task, read `docs/maintenance.md` (or `docs/maintenance.ja.md`)
for the full guide. The recipes there are the source of truth for procedures.

Also read:

- `ARCHITECTURE.md` -- Package overview, ExtendedSpec structure, and integration points
- `src/index.ts` -- The ExtendedSpec definition (source of truth)

## Task: add-global-attribute

Add a new Vue global attribute. Follow recipe #1 in `docs/maintenance.md`.

### Step 1: Identify the attribute

1. Determine the attribute name, type, and description
2. Determine if the attribute is conditional (requires a CSS selector condition)

### Step 2: Add the attribute

1. Read `src/index.ts`
2. Add a new entry under `def['#globalAttrs']['#extends']`
3. Set the `type` field (e.g., `'NoEmptyAny'`)
4. Set the `description` field
5. If conditional, add a `condition` field with a CSS selector (e.g., `'[v-for]'`)

### Step 3: Verify

1. Build: `yarn build --scope @markuplint/vue-spec`
2. Test: `yarn test --scope @markuplint/vue-spec`

## Task: add-element-override

Add an element-specific attribute override. Follow recipe #2 in `docs/maintenance.md`.

### Step 1: Identify the element

1. Determine the element name and the override properties
2. Check the `ExtendedSpec` type in `@markuplint/ml-spec` for available override fields

### Step 2: Add the override

1. Read `src/index.ts`
2. Add a new entry to the `specs` array with the element `name` and override properties
3. Example: `{ name: 'component', possibleToAddProperties: true }`

### Step 3: Verify

1. Build: `yarn build --scope @markuplint/vue-spec`
2. Test: `yarn test --scope @markuplint/vue-spec`

## Rules

1. **Only export an ExtendedSpec object** — no parsing logic belongs in this package.
2. **Global attributes go under `def['#globalAttrs']['#extends']`** — this is the standard location for framework-specific global attributes.
3. **Element overrides go under the `specs[]` array** — each entry must have a `name` field identifying the target element.
4. **Use the `condition` field with CSS selectors for conditional attributes** — e.g., `'[v-for]'` restricts an attribute to elements with the `v-for` directive.
5. **Add JSDoc comments** to document the purpose of new attributes or overrides.
