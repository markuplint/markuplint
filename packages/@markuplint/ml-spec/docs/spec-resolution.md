# Spec Resolution Pipeline

This document describes how `@markuplint/ml-spec` merges a base HTML specification with framework-specific extensions, resolves element and attribute lookups, handles ARIA versioning, and manages caching throughout the pipeline.

## Table of Contents

- [Overview](#overview)
- [Schema Merging (`schemaToSpec`)](#schema-merging-schematospec)
- [Element Spec Lookup](#element-spec-lookup)
- [Namespace Resolution](#namespace-resolution)
- [Attribute Spec Resolution](#attribute-spec-resolution)
- [ARIA Version Resolution](#aria-version-resolution)
- [Array Merging (`mergeArray`)](#array-merging-mergearray)
- [Caching Strategy](#caching-strategy)

---

## Overview

The spec resolution pipeline is the mechanism by which markuplint constructs a
single, unified specification from multiple sources. The overall flow is:

```
@markuplint/html-spec (MLMLSpec)
      +
framework specs (ExtendedSpec[])    e.g., vue-spec, react-spec, svelte-spec
      |
      v
  schemaToSpec()
      |
      v
  merged MLMLSpec  (used by all downstream algorithms)
```

A user's configuration file may reference one or more framework plugins. Each
plugin provides an `ExtendedSpec` that adds, overrides, or extends the base
HTML specification with framework-specific elements, attributes, ARIA
definitions, and content model categories.

All downstream APIs -- element lookup, attribute resolution, ARIA queries,
content model checks -- operate on the merged `MLMLSpec` returned by
`schemaToSpec`. This design means that resolution logic does not need to know
whether a particular definition came from the base spec or an extension.

### Key Types

| Type           | Role                                                                                                 |
| -------------- | ---------------------------------------------------------------------------------------------------- |
| `MLMLSpec`     | The full specification object: cites, defs (globalAttrs, aria, contentModels), and per-element specs |
| `ExtendedSpec` | A partial overlay that may contribute to any section of `MLMLSpec`                                   |
| `ElementSpec`  | Per-element definition: name, categories, attributes, globalAttrs, aria, contentModel                |
| `Attribute`    | Single attribute definition: name, type, description, and other metadata                             |

---

## Schema Merging (`schemaToSpec`)

**File:** `src/utils/schema-to-spec.ts`

```ts
function schemaToSpec(schemas: readonly [MLMLSpec, ...ExtendedSpec[]]): MLMLSpec;
```

The function takes a tuple whose first element is always the base `MLMLSpec`
(typically `@markuplint/html-spec`) and whose remaining elements are zero or
more `ExtendedSpec` objects. It returns a new `MLMLSpec` containing the merged
result.

### Step-by-Step Merge Process

The merge is performed iteratively. Each `ExtendedSpec` in order is folded into
the accumulating result:

```ts
const [main, ...extendedSpecs] = schemas;
const result = { ...main };

for (const extendedSpec of extendedSpecs) {
  // merge each section...
}
```

#### 1. Cites

If the extended spec provides `cites`, they are concatenated onto the existing
array:

```ts
result.cites = [...result.cites, ...extendedSpec.cites];
```

This is simple array concatenation -- no deduplication is performed because
citation sources are expected to be distinct across specs.

#### 2. Global Attributes

The extended spec's `#extends` property is spread into the base spec's
`#HTMLGlobalAttrs` category:

```ts
gAttrs['#HTMLGlobalAttrs'] = {
  ...def['#globalAttrs']?.['#HTMLGlobalAttrs'],
  ...extendedSpec.def['#globalAttrs']?.['#extends'],
};
```

This means a framework can introduce new global attributes (e.g., Vue's `v-if`,
`v-for`) and they become part of `#HTMLGlobalAttrs` for all elements that
reference that category. Existing attributes with the same key are overridden by
the extension.

#### 3. ARIA Definitions

For each ARIA version (`1.1`, `1.2`, `1.3`), the three arrays -- `roles`,
`props`, and `graphicsRoles` -- are merged using `mergeArray`:

```ts
def['#aria'] = {
  '1.1': {
    roles: mergeArray(def['#aria']['1.1'].roles, extendedSpec.def['#aria']['1.1'].roles),
    props: mergeArray(def['#aria']['1.1'].props, extendedSpec.def['#aria']['1.1'].props),
    graphicsRoles: mergeArray(def['#aria']['1.1'].graphicsRoles, extendedSpec.def['#aria']['1.1'].graphicsRoles),
  },
  // same for 1.2 and 1.3
};
```

`mergeArray` uses name-based matching (see [Array Merging](#array-merging-mergearray)),
so an extension can both add new ARIA roles/properties and override existing
definitions.

#### 4. Content Models

All content model categories are unioned. For each category key across both the
base and extension, the selector arrays are concatenated:

```ts
const keys = new Set([...Object.keys(def['#contentModels']), ...Object.keys(extendedSpec.def['#contentModels'])]);

for (const modelName of keys) {
  models[modelName] = [...(mainModel ?? []), ...(exModel ?? [])];
}
```

This means a framework can add its custom elements to existing categories
(e.g., adding `<router-link>` to `#phrasing`) or define entirely new
categories.

#### 5. Element Specs

Elements are matched by name (case-insensitive comparison). For each element in
the base spec:

- If no matching extension element exists, the base element is kept as-is.
- If a match is found, the specs are merged:

```ts
specs.push({
  ...elSpec, // base element spread
  ...exSpec, // extension overrides top-level properties
  globalAttrs: {
    ...elSpec.globalAttrs,
    ...exSpec?.globalAttrs,
  },
  attributes: mergeAttrSpec(elSpec.attributes, exSpec?.attributes),
  categories: mergeArray(elSpec.categories, exSpec?.categories),
});
```

The helper `mergeAttrSpec` unions all attribute keys and spreads the extension
attribute onto the base attribute for each key, allowing partial overrides of
individual attribute definitions.

---

## Element Spec Lookup

**Files:** `src/utils/get-spec.ts`, `src/utils/get-spec-by-tag-name.ts`

The element lookup API has two layers:

### DOM Wrapper: `getSpec`

```ts
function getSpec<K extends keyof ElementSpec>(
  el: Element,
  specs: readonly Pick<ElementSpec, 'name' | K>[],
): Pick<ElementSpec, 'name' | K> | null;
```

A convenience wrapper that extracts `el.localName` and `el.namespaceURI` from a
DOM `Element` and delegates to `getSpecByTagName`.

### Core Lookup: `getSpecByTagName`

```ts
function getSpecByTagName<K extends keyof ElementSpec>(
  specs: readonly Pick<ElementSpec, 'name' | K>[],
  localName: string,
  namespace: string | null,
): Pick<ElementSpec, 'name' | K> | null;
```

Steps:

1. Call `resolveNamespace(localName, namespace)` to get the namespace-qualified
   name (e.g., `"svg:circle"` for an SVG circle element, or `"div"` for an HTML div).
2. Check the module-level `Map<string, ElementSpec | null>` cache using the
   qualified name as key.
3. If not cached, perform a linear search through `specs` matching by `name`.
4. Store the result (including `null` for miss) in the cache and return.

The generic parameter `K` allows callers to request only specific keys from
`ElementSpec`, reducing the amount of data carried through the type system while
still preserving type safety.

---

## Namespace Resolution

**Files:** `src/utils/resolve-namespace.ts`, `src/utils/get-ns.ts`

### `resolveNamespace`

```ts
function resolveNamespace(
  name: string,
  namespaceURI: string | null = 'http://www.w3.org/1999/xhtml',
): NamespacedElementName;
```

Resolves an element name and optional namespace URI into a fully normalized
form:

```ts
type NamespacedElementName = {
  localNameWithNS: string; // e.g., "svg:circle" or "div"
  localName: string; // e.g., "circle" or "div"
  namespace: Namespace; // "html" | "svg" | "mml" | "xlink"
  namespaceURI: NamespaceURI; // full URI string
};
```

Resolution logic:

1. **Split on colon** -- If `name` contains a colon (e.g., `"svg:circle"`), the
   prefix is treated as an explicit namespace hint and the suffix as the local
   name.
2. **Determine namespace** -- The namespace is resolved from the explicit prefix
   or by calling `getNS(namespaceURI)`. If neither yields a recognized
   namespace, it defaults to `'html'`.
3. **Build qualified name** -- For HTML namespace, the qualified name is just the
   local name (no prefix). For all other namespaces, the shorthand is prepended:
   `"svg:circle"`, `"mml:math"`, etc.
4. **Cache** -- Results are cached in a `Map<string, NamespacedElementName>`
   keyed by the concatenation `name + namespaceURI`.

### Namespace URI Mapping

| Namespace URI                        | Shorthand |
| ------------------------------------ | --------- |
| `http://www.w3.org/1999/xhtml`       | `html`    |
| `http://www.w3.org/2000/svg`         | `svg`     |
| `http://www.w3.org/1998/Math/MathML` | `mml`     |
| `http://www.w3.org/1999/xlink`       | `xlink`   |

### `getNS` Helper

```ts
function getNS(namespaceURI: string | null): Namespace;
```

A simple switch-case that maps a namespace URI string to its shorthand. Any
unrecognized URI (including `null`) returns `'html'`.

---

## Attribute Spec Resolution

**Files:** `src/utils/get-attr-specs.ts` (DOM wrapper), `src/utils/get-attr-specs-spec.ts` (core)

### DOM Wrapper: `getAttrSpecs` (from `get-attr-specs.ts`)

```ts
function getAttrSpecs(el: Element, schema: MLMLSpec): readonly Attribute[] | null;
```

Extracts `el.localName` and `el.namespaceURI`, then delegates to the core
function.

### Core Function: `getAttrSpecs` (from `get-attr-specs-spec.ts`)

```ts
function getAttrSpecs(localName: string, namespace: NamespaceURI | null, schema: MLMLSpec): readonly Attribute[] | null;
```

Resolution steps:

1. **Schema invalidation** -- If the `schema` reference has changed (checked via
   a `WeakSet<MLMLSpec>`), the entire attribute cache is cleared. This ensures
   correctness when specs are re-merged.

2. **Cache check** -- Look up the namespace-qualified name in
   `Map<string, readonly Attribute[] | null>`.

3. **Find element spec** -- Search `schema.specs` for a matching element by
   namespace-qualified name. Return `null` (and cache it) if not found.

4. **Collect global attributes** -- Iterate over the element's `globalAttrs`
   selection map. For each category:
   - `false` -- skip the category entirely
   - `true` -- include all attributes from that global category
   - `string[]` -- include only the named attributes from that category

   ```ts
   for (const catName in elSpec.globalAttrs) {
     const catAttrs = elSpec.globalAttrs[catName];
     if (catAttrs === false) continue;
     if (typeof catAttrs === 'boolean') {
       attrs = { ...attrs, ...global };
     }
     if (Array.isArray(catAttrs)) {
       for (const selectedName of catAttrs) {
         attrs[selectedName] = { ...attrs[selectedName], ...global[selectedName] };
       }
     }
   }
   ```

5. **Merge element-specific attributes** -- The element's own `attributes` are
   spread on top of the collected globals, so element-specific definitions
   override globals:

   ```ts
   attrs[attrName] = {
     description: '',
     ...current, // from globals
     ...attr, // from element spec
   };
   ```

6. **Convert to sorted array** -- The attribute map is converted to an
   `Attribute[]`, giving each entry a default `type: 'Any'` if none was
   provided, then sorted alphabetically (case-insensitive) using `nameCompare`.

7. **Cache and return** -- The sorted array is stored in the cache and returned.

### `nameCompare`

```ts
function nameCompare(a: HasName | string, b: HasName | string): number;
```

Case-insensitive sort comparator. Extracts the `name` property (or uses the
string directly), converts to uppercase, and performs standard lexicographic
comparison.

---

## ARIA Version Resolution

**Files:** `src/utils/resolve-version.ts`, `src/utils/aria-version.ts`,
`src/utils/validate-aria-version.ts`, `src/algorithm/aria/get-aria.ts`

### `resolveVersion`

```ts
function resolveVersion(aria: ReadonlyDeep<ARIA>, version: ARIAVersion): Omit<ReadonlyDeep<ARIA>, ARIAVersion>;
```

Extracts a version-specific ARIA definition from a multi-version `ARIA` object.
For each property, the version-specific value is used if present; otherwise the
base (version-agnostic) value applies:

```ts
const implicitRole = aria[version]?.implicitRole ?? aria.implicitRole;
const permittedRoles = aria[version]?.permittedRoles ?? aria.permittedRoles;
// ...etc
```

Special case: `namingProhibited` for version `'1.1'` always uses the base
value, because the naming prohibition concept was not formalized until ARIA 1.2:

```ts
const namingProhibited =
  version === '1.1' ? aria.namingProhibited : (aria[version]?.namingProhibited ?? aria.namingProhibited);
```

The returned object contains only the resolved properties -- the version keys
(`'1.1'`, `'1.2'`, `'1.3'`) are stripped from the type.

### `getARIA`

```ts
function getARIA(
  specs: MLMLSpec,
  localName: string,
  namespace: string | null,
  version: ARIAVersion,
  matches: Matches,
): Omit<ReadonlyDeep<ARIA>, ARIAVersion | 'conditions'> | null;
```

The high-level ARIA resolver. It:

1. Calls `getVersionResolvedARIA` (internal) to get the version-resolved spec.
2. If the spec has `conditions` (CSS-selector-keyed overrides), iterates through
   them and applies the first matching condition's properties. This handles
   cases like `<input type="checkbox">` having different ARIA semantics than
   `<input type="text">`.
3. Optimizes `permittedRoles` -- if both `"presentation"` and `"none"` are in
   the list, ensures both synonyms are present (per WAI-ARIA 1.2 note).

The internal `getVersionResolvedARIA` function caches results in a
`Map<string, ARIA | null>` keyed by `localName + namespace + version`.

### Version Constants and Validation

```ts
// aria-version.ts
const ariaVersions = ['1.1', '1.2', '1.3'] as const;
const ARIA_RECOMMENDED_VERSION = '1.2';

// validate-aria-version.ts
function validateAriaVersion(version: string): version is ARIAVersion;
```

`validateAriaVersion` is a type guard that checks whether a string is a member
of the `ariaVersions` tuple. It is used at configuration boundaries to validate
user-supplied version strings before they enter the typed pipeline.

---

## Array Merging (`mergeArray`)

**File:** `src/utils/merge-array.ts`

```ts
function mergeArray<T extends NamedDefinition>(a: readonly T[], b: readonly T[] | null | undefined): readonly T[];
```

Where `NamedDefinition = string | { readonly name: string }`.

This is the core merge utility used throughout the spec merging pipeline. It
performs **name-based merging** rather than simple concatenation:

### Algorithm

1. If `b` is `null` or `undefined`, return `a` unchanged.
2. Start with a copy of `a`.
3. For each item in `b`:
   - Extract the name using `getName()` (case-insensitive, trimmed).
   - Search for an item with the same name in the result.
   - **No match found:** append the extension item.
   - **Match found (both are strings):** the string is a simple identifier with
     no additional data, so the base item is kept (the splice removes it, then
     the loop continues without pushing a replacement, effectively keeping the
     base version).
   - **Match found (base is string, extension is object):** replace with the
     richer object form from the extension.
   - **Match found (both are objects):** spread-merge the two objects, with the
     extension's properties taking precedence:
     ```ts
     const exItem = { ...aItem, ...bItem };
     ```

### `getName` Helper

```ts
function getName(def: NamedDefinition): string {
  const result = typeof def === 'string' ? def : def.name;
  return result.toLowerCase().trim();
}
```

Names are normalized to lowercase and trimmed before comparison, ensuring
case-insensitive matching.

---

## Caching Strategy

The package uses multiple cache layers to avoid redundant computation. Since
specs are typically loaded once and reused for the lifetime of a lint run, these
caches provide significant performance benefits.

### Cache Inventory

| #   | Location                                        | Cache Type                                                        | Key                                                        | Value                                          | Invalidation                                              |
| --- | ----------------------------------------------- | ----------------------------------------------------------------- | ---------------------------------------------------------- | ---------------------------------------------- | --------------------------------------------------------- |
| 1   | `getSpecByTagName`                              | `Map<string, any>`                                                | Namespace-qualified name (e.g., `"svg:circle"`)            | `ElementSpec \| null`                          | Module lifetime (never cleared)                           |
| 2   | `getVersionResolvedARIA` (inside `get-aria.ts`) | `Map<string, ARIA \| null>`                                       | `localName + namespace + version` (string concatenation)   | Version-resolved ARIA spec or null             | Module lifetime (never cleared)                           |
| 3   | `getContentModel`                               | `Map<Specs, Map<Element, ...>>`                                   | Outer: specs array reference; Inner: DOM Element reference | `PermittedContentPattern[] \| boolean \| null` | Outer map entry created per unique specs reference        |
| 4   | `contentModelCategoryToTagNames`                | `Map<Category, ReadonlyArray<string>>`                            | Category string (e.g., `"#flow"`)                          | Frozen sorted array of tag names               | Module lifetime (never cleared)                           |
| 5   | `resolveNamespace`                              | `Map<string, NamespacedElementName>`                              | `name + namespaceURI` (string concatenation)               | Resolved namespace object                      | Module lifetime (never cleared)                           |
| 6   | `getAttrSpecs` (in `get-attr-specs-spec.ts`)    | `Map<string, readonly Attribute[] \| null>` + `WeakSet<MLMLSpec>` | Namespace-qualified name                                   | Sorted attribute array or null                 | Cleared when schema reference changes (via WeakSet check) |

### Cache Characteristics

**No explicit eviction:** Most caches are module-level `Map` instances that
persist for the entire process lifetime. This is appropriate because:

- Spec data is immutable after merging.
- The number of unique elements/attributes is bounded (HTML has ~120 elements).
- A lint run typically processes one configuration.

**Schema-aware invalidation:** The `getAttrSpecs` cache (item 6) is the
exception. It uses a `WeakSet<MLMLSpec>` to detect when the schema reference
changes. If a new schema is passed (e.g., when running different file patterns
with different framework specs), the entire `cacheMap` is cleared before
proceeding:

```ts
if (!schemaCache.has(schema)) {
  cacheMap.clear();
}
```

**Nested caching:** The `getContentModel` cache (item 3) uses a two-level
`Map<Specs, Map<Element, ...>>` structure. The outer map is keyed by the specs
array reference, so different spec configurations maintain separate caches. The
inner map is keyed by DOM Element reference, so re-querying the same element
within the same spec context is O(1).

**Deterministic keys:** Caches in items 1, 2, and 5 use string concatenation
for keys. Since `resolveNamespace` produces deterministic output for the same
inputs, and spec data does not mutate, these concatenated keys are stable.

### Data Flow with Caching

```
schemaToSpec()  -->  merged MLMLSpec (no cache; called once at startup)
                          |
              +-----------+-----------+
              |           |           |
     getSpecByTagName  getAttrSpecs  getARIA
       (cache 1)       (cache 6)    (cache 2)
              |                       |
       resolveNamespace         resolveVersion
         (cache 5)              (pure; no cache)
                                      |
                               getContentModel
                                 (cache 3)
                                      |
                        contentModelCategoryToTagNames
                                 (cache 4)
```

Each arrow represents a function call. Caches intercept repeated calls at each
layer, so a second lookup for the same element hits cached results at every
level of the call chain.
