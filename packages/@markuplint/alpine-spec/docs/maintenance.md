# Maintenance Guide

## Commands

| Command                                      | Description            |
| -------------------------------------------- | ---------------------- |
| `yarn build --scope @markuplint/alpine-spec` | Build this package     |
| `yarn dev --scope @markuplint/alpine-spec`   | Watch mode build       |
| `yarn clean --scope @markuplint/alpine-spec` | Remove build artifacts |

## Testing

This package has no dedicated test suite. The `ExtendedSpec` object is validated at build time through TypeScript type checking against the `ExtendedSpec` type from `@markuplint/ml-spec`. If the exported object does not conform to the type, the build will fail.

Integration testing occurs downstream:

- `@markuplint/ml-spec` resolves the extended spec and merges it with the base HTML spec
- `@markuplint/ml-core` uses the resolved spec during linting, which exercises the attribute definitions

To verify changes, build the package and run downstream tests:

```shell
yarn build --scope @markuplint/alpine-spec
yarn test --scope @markuplint/ml-spec --scope @markuplint/ml-core
```

## Recipes

### 1. Adding a Global Attribute

All Alpine.js directives are global -- they are available on every HTML element.

1. Open `src/index.ts`
2. Add a new entry under `def['#globalAttrs']['#extends']`:
   ```ts
   /** Description of the directive */
   'x-directiveName': {
       type: 'Any', // or 'Boolean'
   },
   ```
3. Choose the appropriate type:
   - `'Any'` -- accepts any value (strings, expressions, etc.)
   - `'Boolean'` -- boolean attribute (presence indicates `true`)
4. Build: `yarn build --scope @markuplint/alpine-spec`

## ExtendedSpec Type Reference

The `ExtendedSpec` type (from `@markuplint/ml-spec`) has the following structure relevant to this package:

```ts
interface ExtendedSpec {
  cites?: string[];
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
