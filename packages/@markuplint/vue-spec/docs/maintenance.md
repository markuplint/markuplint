# Maintenance Guide

## Commands

| Command                                   | Description            |
| ----------------------------------------- | ---------------------- |
| `yarn build --scope @markuplint/vue-spec` | Build this package     |
| `yarn dev --scope @markuplint/vue-spec`   | Watch mode build       |
| `yarn clean --scope @markuplint/vue-spec` | Remove build artifacts |
| `yarn test --scope @markuplint/vue-spec`  | Run tests              |

## Testing

This package has no dedicated test files because it only exports a static data object. Verification is done through:

1. **Type checking** -- Build with `yarn build --scope @markuplint/vue-spec` to verify the `ExtendedSpec` type is satisfied
2. **Integration testing** -- Run `yarn test --scope @markuplint/vue-parser` to verify the spec works correctly with the Vue parser

## Recipes

### 1. Adding a Global Attribute

1. Open `src/index.ts`
2. Add a new entry under `def['#globalAttrs']['#extends']`:

   ```ts
   attributeName: {
     type: 'NoEmptyAny',
     description: 'Description of the attribute',
   },
   ```

3. Build: `yarn build --scope @markuplint/vue-spec`
4. Test integration: `yarn test --scope @markuplint/vue-parser`

### 2. Adding an Element-Specific Override

1. Open `src/index.ts`
2. Add a new entry to the `specs` array:

   ```ts
   {
     name: 'element-name',
     possibleToAddProperties: true,
   },
   ```

3. Check the `ExtendedSpec` type in `@markuplint/ml-spec` for available override fields
4. Build: `yarn build --scope @markuplint/vue-spec`
5. Test integration: `yarn test --scope @markuplint/vue-parser`

### 3. Adding a Conditional Attribute (with CSS Selector Condition)

Some Vue attributes only apply to elements that meet a certain condition. Use the `condition` field with a CSS selector to restrict when the attribute is available.

1. Open `src/index.ts`
2. Add a new entry under `def['#globalAttrs']['#extends']` with a `condition`:

   ```ts
   attributeName: {
     type: 'NoEmptyAny',
     description: 'Description of the conditional attribute',
     condition: '[v-directive]',
   },
   ```

3. The `condition` value is a CSS attribute selector. For example:
   - `'[v-for]'` -- only on elements with the `v-for` directive
   - `'[v-model]'` -- only on elements with the `v-model` directive
4. Build: `yarn build --scope @markuplint/vue-spec`
5. Test integration: `yarn test --scope @markuplint/vue-parser`

## ExtendedSpec Type Reference

The `ExtendedSpec` type (from `@markuplint/ml-spec`) defines the structure of spec extension objects:

```
ExtendedSpec
├── def
│   └── #globalAttrs
│       └── #extends
│           └── [attributeName]
│               ├── type           — Attribute value type (e.g., 'NoEmptyAny')
│               ├── description    — Human-readable description
│               └── condition?     — CSS selector restricting where the attr applies
└── specs[]
    ├── name                       — Target element name
    └── possibleToAddProperties?   — Allow dynamic properties on the element
```
