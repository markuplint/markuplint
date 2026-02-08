# Type Definitions Reference

This document describes the type definitions and JSON schemas used by `@markuplint/ml-spec`.

## Overview

`@markuplint/ml-spec` employs a two-layer type system:

1. **Hand-written types** in `src/types/index.ts` -- define the runtime interfaces used throughout markuplint for element specs, ARIA roles, attributes, and role computation results.
2. **Generated types** from JSON schemas -- define schema-validated structures that are auto-generated from `.schema.json` files using `json-schema-to-typescript`. These files carry "DO NOT MODIFY" headers.

Hand-written types import and extend generated types where needed (for example, `Attribute` extends `AttributeJSON`), creating a clean separation between the schema-validated data layer and the runtime API layer.

## Core Specification Types

These types are defined in `src/types/index.ts` and form the backbone of markuplint's spec system.

### `MLMLSpec`

The root specification type representing a complete markup language spec.

```ts
interface MLMLSpec {
  readonly cites: Cites; // Reference URLs (readonly string[])
  readonly def: SpecDefs; // Internal definitions (global attrs, ARIA, content models)
  readonly specs: readonly ElementSpec[]; // Element specifications array
}
```

### `ExtendedSpec`

A partial specification used by framework-specific packages to extend or customize the base spec. Used by `@markuplint/vue-spec`, `@markuplint/react-spec`, and similar packages.

```ts
type ExtendedSpec = {
  readonly cites?: Cites;
  readonly def?: Partial<SpecDefs>;
  readonly specs?: readonly ExtendedElementSpec[];
};
```

`ExtendedElementSpec` is a partial version of `ElementSpec` where only `name` is required. All other properties are optional overrides. Attributes use `Partial<Attribute>` to allow specifying only changed fields:

```ts
type ExtendedElementSpec = Partial<Omit<ElementSpec, 'name' | 'attributes'>> & {
  readonly name: ElementSpec['name'];
  readonly attributes?: Readonly<Record<string, Partial<Attribute>>>;
};
```

### `SpecDefs`

Internal definition data within a markup language spec, containing global attributes, ARIA role/property definitions, and content model category mappings.

```ts
type SpecDefs = {
  readonly '#globalAttrs': {
    readonly [category: string]: Readonly<Record<string, Partial<Attribute>>>;
  };
  readonly '#aria': {
    readonly '1.3': ARIASpec;
    readonly '1.2': ARIASpec;
    readonly '1.1': ARIASpec;
  };
  readonly '#contentModels': {
    readonly [model in Category]?: readonly string[];
  };
};
```

- **`#globalAttrs`** -- Category-keyed attribute definitions. Each category (e.g., `#HTMLGlobalAttrs`, `#ARIAAttrs`) maps to a record of partial attribute definitions.
- **`#aria`** -- ARIA role/property definitions for each specification version (1.1, 1.2, 1.3). Each version contains `roles`, `graphicsRoles`, and `props` arrays.
- **`#contentModels`** -- Content model category to selector array mappings. Maps `Category` values (like `#flow`, `#phrasing`) to arrays of CSS selectors that match elements belonging to that category.

### `ElementSpec`

A complete element specification describing all aspects of a single HTML or SVG element.

```ts
type ElementSpec = {
  readonly name: string; // Tag name
  readonly namespace?: NamespaceURI; // XML namespace URI
  readonly cite: string; // Reference URL
  readonly description?: string; // Human-readable description

  // Status flags
  readonly experimental?: true; // Experimental technology
  readonly obsolete?: true | { readonly alt: string }; // Obsolete (optionally with alternative)
  readonly deprecated?: true; // Deprecated
  readonly nonStandard?: true; // Non-standard

  // Structural properties
  readonly categories: readonly Category[]; // Element categories
  readonly contentModel: ReadonlyDeep<ContentModel>; // Permitted content patterns
  readonly omission: ElementSpecOmission; // Tag omission rules

  // Attributes and ARIA
  readonly globalAttrs: ReadonlyDeep<GlobalAttributes>; // Global attribute selection
  readonly attributes: Readonly<Record<string, Attribute>>; // Element-specific attributes
  readonly aria: ReadonlyDeep<ARIA>; // WAI-ARIA role and property mappings

  // Template engine support
  readonly possibleToAddProperties?: true; // Allow arbitrary properties (for template engines)
};
```

`ElementSpecOmission` is either `false` (no omission allowed) or an object with `startTag` and `endTag` fields indicating whether tag omission is permitted.

### `Attribute`

Describes a single HTML/SVG attribute with its type, description, and status flags.

```ts
type Attribute = {
  readonly name: string;
  readonly type: ReadonlyDeep<AttributeType> | readonly ReadonlyDeep<AttributeType>[];
  readonly description?: string;
  readonly caseSensitive?: true;
  readonly experimental?: boolean;
  readonly obsolete?: true;
  readonly deprecated?: boolean;
  readonly nonStandard?: true;
} & ExtendableAttributeSpec;
```

The `& ExtendableAttributeSpec` intersection adds fields from the generated `AttributeJSON` type (excluding `type`, which is overridden with the `ReadonlyDeep` wrapper): `defaultValue`, `required`, `requiredEither`, `noUse`, `condition`, `ineffective`, `animatable`.

## ARIA Types

### `ARIARole`

A fully resolved ARIA role with all its properties, requirements, and naming constraints.

```ts
type ARIARole = {
  readonly name: string; // Role name (e.g., 'button', 'navigation')
  readonly isAbstract: boolean; // Whether this is an abstract role
  readonly deprecated: boolean; // Whether this role is deprecated

  // Context requirements
  readonly requiredContextRole: readonly string[]; // Required parent roles
  readonly requiredOwnedElements: readonly string[]; // Required child roles

  // Accessible name constraints
  readonly accessibleNameRequired: boolean; // Must have an accessible name
  readonly accessibleNameFromAuthor: boolean; // Name can come from author (aria-label, etc.)
  readonly accessibleNameFromContent: boolean; // Name can come from element content
  readonly accessibleNameProhibited: boolean; // Name is prohibited

  // Properties
  readonly childrenPresentational: boolean; // Children are presentational
  readonly ownedProperties: readonly ARIARoleOwnedProperties[];
  readonly prohibitedProperties: readonly string[];
};
```

### `ARIARoleInSchema`

An ARIA role as defined in the raw schema data. All properties are optional except `name`, since the schema may provide only partial role information. Also includes optional `description` and `generalization` (super-class roles) fields.

```ts
type ARIARoleInSchema = Partial<
  ARIARole & {
    readonly description: string;
    readonly generalization: readonly string[];
  }
> & {
  readonly name: string;
};
```

### `ARIARoleOwnedProperties`

Describes a property owned by an ARIA role, including whether it is inherited, required, or deprecated.

```ts
type ARIARoleOwnedProperties = {
  readonly name: string; // Property name (e.g., 'aria-expanded')
  readonly inherited?: true; // Inherited from a superclass role
  readonly required?: true; // Required for this role
  readonly deprecated?: true; // Deprecated for this role
};
```

### `ARIAProperty`

Describes an ARIA property or state, including its value type, enumeration values, and equivalent HTML attributes.

```ts
type ARIAProperty = {
  readonly name: string; // Property name (e.g., 'aria-hidden')
  readonly type: 'property' | 'state'; // Whether this is a property or state
  readonly deprecated?: true;
  readonly isGlobal?: true; // Whether this is a global ARIA attribute
  readonly value: ARIAAttributeValue; // Value type
  readonly conditionalValue?: readonly {
    // Role-specific value overrides
    readonly role: readonly string[];
    readonly value: ARIAAttributeValue;
  }[];
  readonly enum: readonly string[]; // Allowed token values
  readonly defaultValue?: string;
  readonly equivalentHtmlAttrs?: readonly EquivalentHtmlAttr[];
  readonly valueDescriptions?: Readonly<Record<string, string>>;
};
```

### `ARIAAttributeValue`

The possible value types for ARIA attributes, as defined by the WAI-ARIA specification.

```ts
type ARIAAttributeValue =
  | 'true/false'
  | 'tristate'
  | 'true/false/undefined'
  | 'ID reference'
  | 'ID reference list'
  | 'integer'
  | 'number'
  | 'string'
  | 'token'
  | 'token list'
  | 'URI';
```

### `ARIAVersion`

A union type of supported ARIA specification version strings, derived from the `ariaVersions` tuple (`['1.1', '1.2', '1.3'] as const`).

```ts
type ARIAVersion = '1.1' | '1.2' | '1.3';
```

The recommended default version is `'1.2'` (defined as `ARIA_RECOMMENDED_VERSION` in `src/utils/aria-version.ts`).

### `ComputedRole`

The result of computing an element's ARIA role.

```ts
type ComputedRole = {
  readonly el: Element;
  readonly role:
    | (ARIARole & {
        readonly superClassRoles: readonly ARIARoleInSchema[];
        readonly isImplicit?: boolean;
      })
    | null;
  readonly errorType?: RoleComputationError;
};
```

- **`el`** -- The DOM element reference.
- **`role`** -- The resolved role (with super-class chain and implicit flag), or `null` if no role applies.
- **`errorType`** -- Optional error code indicating issues during role computation.

### `RoleComputationError`

Error codes that may arise during ARIA role computation, indicating specific issues such as abstract roles, invalid context, or presentational conflicts.

| Error Code                                          | Description                                                              |
| --------------------------------------------------- | ------------------------------------------------------------------------ |
| `ABSTRACT`                                          | An abstract role was assigned (abstract roles must not be used directly) |
| `GLOBAL_PROP_MUST_NOT_BE_PRESENTATIONAL`            | Element with global ARIA properties must not be presentational           |
| `IMPLICIT_ROLE_NAMESPACE_ERROR`                     | Implicit role does not match the element's namespace                     |
| `INTERACTIVE_ELEMENT_MUST_NOT_BE_PRESENTATIONAL`    | Interactive element must not be presentational                           |
| `INVALID_LANDMARK`                                  | Invalid landmark role usage                                              |
| `INVALID_REQUIRED_CONTEXT_ROLE`                     | Required context role is not satisfied                                   |
| `NO_EXPLICIT`                                       | No explicit role was assigned                                            |
| `NO_OWNER`                                          | No owning element found for required context                             |
| `NO_PERMITTED`                                      | The role is not permitted on this element                                |
| `REQUIRED_OWNED_ELEMENT_MUST_NOT_BE_PRESENTATIONAL` | Required owned element must not be presentational                        |
| `ROLE_NO_EXISTS`                                    | The specified role does not exist                                        |

## Utility Types

### `Matches`

A function type that tests whether an element matches a given CSS selector string. Typically bound to `Element.prototype.matches`.

```ts
type Matches = (selector: string) => boolean;
```

### `Cites`

Reference URL array type used throughout the spec.

```ts
type Cites = readonly string[];
```

### `EquivalentHtmlAttr`

Describes an HTML attribute that is semantically equivalent to an ARIA property, enabling automatic mapping from HTML attributes to ARIA states/properties.

```ts
type EquivalentHtmlAttr = {
  readonly htmlAttrName: string;
  readonly isNotStrictEquivalent?: true;
  readonly value: string | null;
};
```

## Generated Types

These types are automatically generated from JSON schema files by `json-schema-to-typescript`. They carry "DO NOT MODIFY" headers and should not be edited directly.

### From `aria.schema.json` -- `src/types/aria.ts`

**`ARIA`** -- Element-level ARIA specification with conditions and version overrides.

```ts
interface ARIA {
  implicitRole: ImplicitRole;
  permittedRoles: PermittedRoles;
  namingProhibited?: true;
  implicitProperties?: ImplicitProperties;
  properties?: PermittedARIAProperties;
  conditions?: {
    [selector: string]: {
      /* per-condition overrides */
    };
  };
  '1.3'?: {
    /* version-specific overrides */
  };
  '1.2'?: {
    /* version-specific overrides */
  };
  '1.1'?: {
    /* version-specific overrides */
  };
}
```

**`ImplicitRole`** -- The element's implicit (default) role.

```ts
type ImplicitRole = false | string; // false means "No corresponding role"
```

**`PermittedRoles`** -- Which roles are permitted on the element.

```ts
type PermittedRoles =
  | boolean // true = "Any role", false = "No role"
  | (string | { name: string; deprecated?: true })[] // Specific role list
  | PermittedARIAAAMInfo; // AAM-delegated (core-aam or graphics-aam)
```

**`PermittedARIAProperties`** -- ARIA property constraints for an element.

```ts
type PermittedARIAProperties =
  | false // "No role or aria-* attributes"
  | {
      global?: true; // Allow global ARIA properties
      role?: true | string | [string, ...string[]]; // Properties applicable to allowed roles
      only?: [
        /* specific properties */
      ]; // Whitelist of allowed properties
      without?: [
        /* prohibited properties with severity */
      ]; // Blacklist with severity levels
    };
```

**`ImplicitProperties`** -- Default ARIA property values (keys matching `^aria-.+`).

```ts
interface ImplicitProperties {
  [ariaProperty: string]: string; // e.g., { 'aria-checked': 'false' }
}
```

### From `attributes.schema.json` -- `src/types/attributes.ts`

**`AttributeType`** -- A large union type covering all recognized attribute value types. Includes:

- **CSS property names**: `<'color'>`, `<'display'>`, `<'font-size'>`, etc. (hundreds of standard, vendor-prefixed, and deprecated CSS properties)
- **CSS value types**: `<color>`, `<length>`, `<number>`, `<url>`, `<integer>`, etc.
- **SVG-specific types**: `<svg-path>`, `<view-box>`, `<preserve-aspect-ratio>`, etc.
- **markuplint custom types**: `DOMID`, `URL`, `BCP47`, `MIMEType`, `DateTime`, `AutoComplete`, `Int`, `Uint`, `Number`, `Boolean`, `Any`, `JSON`, `FunctionBody`, etc.
- **Structured type variants**: `List`, `Enum`, `Number`, `Directive`

**`GlobalAttributes`** -- Attribute category selection specifying which global attribute categories apply to an element.

```ts
interface GlobalAttributes {
  '#HTMLGlobalAttrs'?: boolean;
  '#GlobalEventAttrs'?: boolean | string[];
  '#HTMLLinkAndFetchingAttrs'?: string[];
  '#HTMLEmbededAndMediaContentAttrs'?: string[];
  '#HTMLFormControlElementAttrs'?: string[];
  '#HTMLTableCellElementAttrs'?: string[];
  '#ARIAAttrs'?: boolean;
  '#SVGAnimationAdditionAttrs'?: string[];
  '#SVGAnimationAttributeTargetAttrs'?: string[];
  '#SVGAnimationEventAttrs'?: string[];
  '#SVGAnimationTargetElementAttrs'?: string[];
  '#SVGAnimationTimingAttrs'?: string[];
  '#SVGAnimationValueAttrs'?: string[];
  '#SVGConditionalProcessingAttrs'?: string[];
  '#SVGCoreAttrs'?: string[];
  '#SVGFilterPrimitiveAttrs'?: string[];
  '#SVGPresentationAttrs'?: string[];
  '#SVGTransferFunctionAttrs'?: string[];
  '#XLinkAttrs'?: string[];
}
```

**`AttributeJSON`** -- Raw attribute definition with type, conditions, and flags.

```ts
interface AttributeJSON {
  type?: AttributeType | [AttributeType, ...AttributeType[]];
  defaultValue?: string;
  deprecated?: boolean;
  required?: boolean | AttributeCondition;
  requiredEither?: string[];
  noUse?: boolean;
  condition?: AttributeCondition;
  ineffective?: AttributeCondition;
  animatable?: boolean;
  experimental?: boolean;
}
```

**`List`** -- Structured type for space-separated or comma-separated token lists.

```ts
interface List {
  token: string | Enum; // Token type or enum definition
  separator: 'space' | 'comma'; // Separator type
  disallowToSurroundBySpaces?: boolean;
  allowEmpty?: boolean;
  ordered?: boolean;
  unique?: boolean;
  caseInsensitive?: boolean;
  number?: ('zeroOrMore' | 'oneOrMore') | { min: number; max: number };
}
```

**`Enum`** -- Enumerated attribute values.

```ts
interface Enum {
  enum: [string, ...string[]]; // At least one value required
  disallowToSurroundBySpaces?: boolean;
  caseInsensitive?: boolean;
  invalidValueDefault?: string; // Default when value is invalid
  missingValueDefault?: string; // Default when attribute is missing
  sameStates?: { [k: string]: unknown };
}
```

**`Number`** -- Numeric attribute constraints.

```ts
interface Number {
  type: 'float' | 'integer';
  gt?: number; // Greater than
  gte?: number; // Greater than or equal
  lt?: number; // Less than
  lte?: number; // Less than or equal
  clampable?: boolean;
}
```

**`Directive`** -- Directive-based attribute validation for complex attributes containing both directives and tokens.

```ts
interface Directive {
  directive: [string, ...string[]]; // At least one directive
  token: AttributeType; // Token type to validate
  ref?: string; // Reference URL
}
```

### From `content-models.schema.json` -- `src/types/permitted-structures.ts`

**`PermittedContentPattern`** -- A union of all content model pattern types.

```ts
type PermittedContentPattern =
  | PermittedContentRequire // Required content
  | PermittedContentOptional // Optional content
  | PermittedContentOneOrMore // One or more occurrences
  | PermittedContentZeroOrMore // Zero or more occurrences
  | PermittedContentChoice // Choice between content alternatives
  | PermittedContentTransparent; // Transparent content model
```

Each pattern variant (except `PermittedContentTransparent`) accepts either a `Model` or a nested `PermittedContentPattern[]` and supports an optional `max` count.

**`ContentModel`** -- Complete content model for an element.

```ts
interface ContentModel {
  contents: PermittedContentPattern[] | boolean; // Content patterns or boolean
  descendantOf?: string; // Context restriction
  conditional?: {
    // Condition-dependent content
    condition: string;
    contents: PermittedContentPattern[] | boolean;
  }[];
}
```

**`Category`** -- Content model category. Includes 13 HTML categories and 19 SVG categories.

HTML categories:

- `#text`, `#phrasing`, `#flow`, `#interactive`, `#heading`
- `#sectioning`, `#metadata`, `#embedded`, `#palpable`, `#script-supporting`

SVG categories:

- `#SVGAnimation`, `#SVGBasicShapes`, `#SVGContainer`, `#SVGDescriptive`
- `#SVGFilterPrimitive`, `#SVGFont`, `#SVGGradient`, `#SVGGraphics`
- `#SVGGraphicsReferencing`, `#SVGLightSource`, `#SVGNeverRendered`
- `#SVGNone`, `#SVGPaintServer`, `#SVGRenderable`, `#SVGShape`
- `#SVGStructural`, `#SVGStructurallyExternal`, `#SVGTextContent`, `#SVGTextContentChild`

**`Model`** and **`ContentType`**:

```ts
type Model = ContentType | ContentType[];
type ContentType = string | Category;
```

## JSON Schema Files

The following JSON schema files are located in the `schemas/` directory.

| Schema File                     | Lines | Description                                                                                                         |
| ------------------------------- | ----- | ------------------------------------------------------------------------------------------------------------------- |
| `element.schema.json`           | 11    | Top-level element schema combining `$ref` pointers to content models, attributes, global attributes, and ARIA       |
| `aria.schema.json`              | 291   | ARIA role/property definitions including implicit roles, permitted roles, properties, and version overrides         |
| `attributes.schema.json`        | 190   | Attribute type unions, attribute JSON definitions, global attribute category selection, and attribute name patterns |
| `content-models.schema.json`    | 215   | Content model patterns (require, optional, oneOrMore, zeroOrMore, choice, transparent) and category definitions     |
| `global-attributes.schema.json` | 787   | Global attribute categories for HTML and SVG (auto-generated from `gen/global-attribute.data.ts`)                   |

## Schema Generation Workflow

The schema generation pipeline works as follows:

1. **`gen/global-attribute.data.ts`** defines the source-of-truth data for global attribute categories, listing all attribute names per category.

2. **`gen/gen.ts`** reads the global attribute data and generates two schema files:
   - `schemas/global-attributes.schema.json` -- The full global attributes schema with category definitions and per-category enums.
   - `schemas/attributes.schema.json` -- The attributes schema including `GlobalAttributes` type with category-specific property selectors.

3. **`json-schema-to-typescript`** converts each `.schema.json` file into corresponding TypeScript files:
   - `schemas/aria.schema.json` --> `src/types/aria.ts`
   - `schemas/attributes.schema.json` --> `src/types/attributes.ts`
   - `schemas/content-models.schema.json` --> `src/types/permitted-structures.ts`

4. Generated TypeScript files include "DO NOT MODIFY" headers. To update generated types, modify the source JSON schema (or the generation script for auto-generated schemas), then re-run the generation pipeline.
