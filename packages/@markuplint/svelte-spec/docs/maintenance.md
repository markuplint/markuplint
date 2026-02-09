# Maintenance Guide

## Commands

| Command                                      | Description            |
| -------------------------------------------- | ---------------------- |
| `yarn build --scope @markuplint/svelte-spec` | Build this package     |
| `yarn dev --scope @markuplint/svelte-spec`   | Watch mode build       |
| `yarn clean --scope @markuplint/svelte-spec` | Remove build artifacts |
| `yarn test --scope @markuplint/svelte-spec`  | Run tests              |

## Testing

This package has no test files by default because it exports only a static data object. Verification is done through the build step (TypeScript type checking ensures the exported object conforms to the `ExtendedSpec` type).

To verify integration with downstream packages:

```shell
yarn test --scope @markuplint/svelte-parser
```

## Recipes

### 1. Adding a Global Attribute

1. Read `src/index.ts`
2. If the `def` property does not exist on the spec object, add it:
   ```ts
   const spec: ExtendedSpec = {
     def: {
       '#globalAttrs': {
         '#extends': {
           'new-attribute': {
             type: 'Any',
           },
         },
       },
     },
     specs: [
       // existing entries...
     ],
   };
   ```
3. If `def['#globalAttrs']['#extends']` already exists, add the new attribute to the existing object
4. Build: `yarn build --scope @markuplint/svelte-spec`
5. Verify the downstream parser still works: `yarn test --scope @markuplint/svelte-parser`

### 2. Adding an Element-Specific Override

1. Read `src/index.ts`
2. Check if the target element already has an entry in the `specs` array
3. If the element exists, add the new attribute to its `attributes` object:
   ```ts
   {
     name: 'existing-element',
     attributes: {
       existingAttr: { type: 'Any' },
       newAttr: { type: 'Any' },  // add here
     },
   },
   ```
4. If the element does not exist, add a new entry to the `specs` array:
   ```ts
   {
     name: 'new-element',
     attributes: {
       'attribute-name': {
         type: 'Any',
       },
     },
   },
   ```
5. Build: `yarn build --scope @markuplint/svelte-spec`
6. Verify the downstream parser still works: `yarn test --scope @markuplint/svelte-parser`

## ExtendedSpec Type Reference

The `ExtendedSpec` type (from `@markuplint/ml-spec`) has the following structure:

```ts
type ExtendedSpec = {
  readonly cites?: Cites; // Reference URLs
  readonly def?: Partial<SpecDefs>; // Global definitions
  readonly specs?: readonly ExtendedElementSpec[]; // Per-element overrides
};
```

### `def` -- Global Definitions

Used for attributes that apply to all elements:

```ts
def: {
  '#globalAttrs': {
    '#extends': {
      'attribute-name': {
        type: 'Any',
      },
    },
  },
}
```

### `specs` -- Per-Element Overrides

Each entry in the `specs` array targets a specific HTML element:

```ts
specs: [
  {
    name: 'element-name', // HTML tag name
    attributes: {
      'attribute-name': {
        type: 'Any', // Type override
      },
    },
  },
];
```

Common attribute type values:

| Type Value  | Meaning                                  |
| ----------- | ---------------------------------------- |
| `'Any'`     | Accepts any type (used for bound values) |
| `'String'`  | Accepts only string values               |
| `'Boolean'` | Boolean attribute (presence/absence)     |
