---
description: Maintenance tasks for @markuplint/react-spec
globs:
  - packages/@markuplint/react-spec/src/**/*.ts
alwaysApply: false
---

# react-spec-maintenance

Perform maintenance tasks for `@markuplint/react-spec`: add global attributes,
add element-specific overrides, and modify the ExtendedSpec object.

## Input

`$ARGUMENTS` specifies the task. Supported tasks:

| Task                   | Description                                    |
| ---------------------- | ---------------------------------------------- |
| `add-global-attribute` | Add a new global attribute to the ExtendedSpec |
| `add-element-override` | Add an element-specific attribute override     |

If omitted, defaults to `add-global-attribute`.

## Reference

Before executing any task, read `docs/maintenance.md` (or `docs/maintenance.ja.md`)
for the full guide. The recipes there are the source of truth for procedures.

Also read:

- `ARCHITECTURE.md` -- Package overview, ExtendedSpec content, and integration points
- `src/index.ts` -- ExtendedSpec object definition (source of truth)

## Task: add-global-attribute

Add a new global attribute available on every JSX element. Follow recipe #1 in `docs/maintenance.md`.

### Step 1: Identify the attribute

1. Determine the attribute name, type (`Any`, `Boolean`, or a specific type), and description
2. Check the React documentation to confirm the attribute is a valid global JSX attribute

### Step 2: Add the attribute

1. Read `src/index.ts`
2. Add a new entry under `def['#globalAttrs']['#extends']`:
   ```ts
   attributeName: {
       type: 'Any', // or 'Boolean'
   },
   ```
3. Add a JSDoc comment above the entry describing its purpose

### Step 3: Verify

1. Build: `yarn build --scope @markuplint/react-spec`
2. Confirm the attribute appears in the exported spec object

## Task: add-element-override

Add an element-specific attribute override. Follow recipe #2 in `docs/maintenance.md`.

### Step 1: Identify the element and attribute

1. Determine the target element name (e.g., `input`, `select`, `textarea`)
2. Determine the attribute name, type, and optional conditions

### Step 2: Add the override

1. Read `src/index.ts`
2. Find the element in the `specs[]` array, or add a new entry:
   ```ts
   {
       name: 'elementName',
       attributes: {
           attributeName: {
               type: 'Any',
           },
       },
   },
   ```
3. If the attribute has conditions (e.g., only for certain input types), add a `condition` array:
   ```ts
   condition: ['[type=checkbox]', '[type=radio]'],
   ```
4. If the attribute is case-sensitive, add `caseSensitive: true`
5. Add a JSDoc comment above the entry describing its purpose

### Step 3: Verify

1. Build: `yarn build --scope @markuplint/react-spec`
2. Confirm the attribute appears in the exported spec object

## Rules

1. **Only export an ExtendedSpec object** -- this package contains no parsing logic.
2. **Global attributes go under `def['#globalAttrs']['#extends']`** -- they apply to all elements.
3. **Element overrides go under `specs[]` array** -- each entry targets a specific HTML element by name.
4. **Each attribute needs at minimum a `type` field** -- valid types include `Any`, `Boolean`, and specific type strings.
5. **Add JSDoc comments** to all new attribute entries describing their purpose.
