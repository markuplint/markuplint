# Maintenance Guide

## Commands

| Command                                     | Description            |
| ------------------------------------------- | ---------------------- |
| `yarn build --scope @markuplint/react-spec` | Build this package     |
| `yarn dev --scope @markuplint/react-spec`   | Watch mode build       |
| `yarn clean --scope @markuplint/react-spec` | Remove build artifacts |

## Testing

This package has no dedicated test suite. The `ExtendedSpec` object is validated at build time through TypeScript type checking against the `ExtendedSpec` type from `@markuplint/ml-spec`. If the exported object does not conform to the type, the build will fail.

Integration testing occurs downstream:

- `@markuplint/ml-spec` resolves the extended spec and merges it with the base HTML spec
- `@markuplint/ml-core` uses the resolved spec during linting, which exercises the attribute definitions

To verify changes, build the package and run downstream tests:

```shell
yarn build --scope @markuplint/react-spec
yarn test --scope @markuplint/ml-spec --scope @markuplint/ml-core
```

## Recipes

### 1. Adding a Global Attribute

Global attributes are available on every JSX element.

1. Open `src/index.ts`
2. Add a new entry under `def['#globalAttrs']['#extends']`:
   ```ts
   /** Description of the attribute */
   attributeName: {
       type: 'Any', // or 'Boolean'
   },
   ```
3. Choose the appropriate type:
   - `'Any'` -- accepts any value (strings, expressions, etc.)
   - `'Boolean'` -- boolean attribute (presence means `true`)
4. Build: `yarn build --scope @markuplint/react-spec`

### 2. Adding an Element-Specific Override

Element overrides define attributes available only on specific HTML elements.

1. Open `src/index.ts`
2. Find the target element in the `specs[]` array. If it does not exist, add a new entry:
   ```ts
   {
       name: 'elementName',
       attributes: {
           /** Description of the attribute */
           attributeName: {
               type: 'Any',
           },
       },
   },
   ```
3. If the element already exists, add the new attribute to its `attributes` object
4. Build: `yarn build --scope @markuplint/react-spec`

### 3. Adding a Conditional Attribute

Conditional attributes are only valid when the element matches a CSS selector condition.

1. Open `src/index.ts`
2. Find or create the element entry in the `specs[]` array
3. Add the attribute with a `condition` array:
   ```ts
   attributeName: {
       type: 'Boolean',
       caseSensitive: true,
       condition: ['[type=checkbox]', '[type=radio]'],
   },
   ```
4. The `condition` array uses CSS attribute selector syntax
5. Multiple conditions are treated as an OR -- the attribute is valid if any condition matches
6. Set `caseSensitive: true` if the attribute name must be case-sensitive (typical for React JSX attributes)
7. Build: `yarn build --scope @markuplint/react-spec`

## ExtendedSpec Type Reference

The `ExtendedSpec` type (from `@markuplint/ml-spec`) has the following structure relevant to this package:

```ts
interface ExtendedSpec {
  def?: {
    '#globalAttrs'?: {
      '#extends': Record<string, AttributeSpec>;
    };
  };
  specs?: Array<{
    name: string;
    attributes: Record<string, AttributeSpec>;
  }>;
}
```

### AttributeSpec Fields

| Field           | Type       | Required | Description                                            |
| --------------- | ---------- | -------- | ------------------------------------------------------ |
| `type`          | `string`   | Yes      | The attribute value type (`'Any'`, `'Boolean'`, etc.)  |
| `caseSensitive` | `boolean`  | No       | Whether the attribute name is case-sensitive           |
| `condition`     | `string[]` | No       | CSS selector conditions for when the attribute applies |

### Type Values

- `'Any'` -- The attribute accepts any value
- `'Boolean'` -- The attribute is a boolean (presence indicates `true`)
