# Pretender System in MLDOM

**Primary source:** `src/ml-dom/node/element.ts` (`pretending()`, `matchMLSelector()`, property getters)
**Related:** `src/ml-dom/node/document.ts` (`_pretending()`), `src/ml-dom/helper/accname.ts` (`getAccnameFromPretender()`)

## Overview

The pretender system allows authored components (e.g., `<MyButton>`, `<AppLink>`) to be treated as standard HTML elements (e.g., `<button>`, `<a>`) during linting. This is critical for rules that depend on HTML semantics — such as `wai-aria` (accessible name/role validation) and `permitted-contents` (content model validation) — to work correctly with framework components.

The system works by creating a **virtual MLElement** that represents the standard HTML element, and establishing a **bidirectional link** between the original component element and the virtual element. MLDOM property getters and methods check this link to transparently return the pretender's data when appropriate.

For pretender configuration syntax, see the [markuplint configuration documentation](https://markuplint.dev/docs/configuration/properties#pretenders).

## Architecture

### Initialization Flow

Pretender initialization happens during `MLDocument` construction, after all nodes are created but before rule mapping:

```
MLDocument constructor
  ├── 1. Parse AST → create MLDOM nodes (nodeList)
  ├── 2. _pretending(pretenders)          ← Pretender initialization
  │     └── For each ELEMENT_NODE in nodeList:
  │           └── element.pretending(pretenders)
  └── 3. _ruleMapping(ruleset)            ← Rule assignment
```

This ordering is intentional: pretenders must be established **before** rule mapping, because rule selectors (e.g., `nodeRules` targeting `button`) need to match against the pretender identity.

### `pretending()` Method

The `pretending()` method on `MLElement` is the core initialization logic. It is called once per element during document construction.

**Step 1: Find matching config**

```typescript
const pretenderConfig = pretenders?.find(option => this.matches(option.selector));
```

Iterate through the pretender configurations and find the first one whose CSS selector matches this element.

**Step 2: Fallback via `as` attribute**

```typescript
const asAttrValue = this.getAttribute('as');
const pretenderElement =
  pretenderConfig?.as ??
  (this.elementType === 'html' || !asAttrValue ? null : { element: asAttrValue, inheritAttrs: true });
```

If no explicit config matches but the element is a non-HTML element (i.e., `elementType !== 'html'`) and has an `as` attribute, use that attribute value as a fallback. This allows `<MyButton as="button">` to work without explicit config.

**Step 3: Resolve the pretender definition**

The `as` field can be either a simple string (tag name) or an `OriginalNode` object with detailed options:

| Field                    | Type             | Description                                                            |
| ------------------------ | ---------------- | ---------------------------------------------------------------------- |
| `element`                | `string`         | Target HTML tag name (e.g., `"button"`, `"a"`)                         |
| `namespace`              | `string?`        | `'svg'` for SVG elements; defaults to `'html'`                         |
| `inheritAttrs`           | `boolean?`       | Copy the original element's attributes to the virtual element          |
| `attrs`                  | `Array?`         | Additional attributes to add to the virtual element                    |
| `attrs[].value.fromAttr` | `string?`        | Inherit the value from the specified attribute on the original element |
| `aria`                   | `PretenderARIA?` | Accessible name configuration                                          |

**Step 4: Create the virtual element**

A new `MLElement` is constructed with a synthetic AST node:

```typescript
const as = new MLElement<T, O>(
  {
    ...this._astToken,
    uuid: this.uuid + '_pretender',
    raw: `<${nodeName}>`,
    nodeName,
    namespace,
    elementType: 'html',
    attributes, // merged from inheritAttrs + attrs
  },
  this.ownerMLDocument,
);
```

The virtual element reuses the original element's AST token as a base (inheriting source position), but overrides the tag name, namespace, and attributes.

**Step 5: Set up bidirectional links**

```typescript
as.pretenderContext = { type: 'origin', origin: this };
this.pretenderContext = { type: 'pretender', as, aria };
```

**Step 6: Share children**

```typescript
as.resetChildren(this.childNodes);
```

The virtual element receives the original element's child nodes, so that content model validation works against the same children.

### `pretenderContext` Type

```typescript
// On the original element (e.g., <MyButton>)
{ type: 'pretender', as: MLElement, aria?: PretenderARIA }

// On the virtual element (e.g., the synthetic <button>)
{ type: 'origin', origin: MLElement }

// Not participating
null
```

## Property Delegation

When `pretenderContext.type === 'pretender'`, several `MLElement` property getters delegate to the virtual element:

### Name Properties

```
<MyButton>  (pretenderContext.type === 'pretender', as → <button>)

localName  → this.pretenderContext.as.localName  → "button"
nodeName   → this.pretenderContext.as.nodeName   → "BUTTON"
tagName    → this.pretenderContext.as.nodeName   → "BUTTON"
rawName    → this._astToken.nodeName             → "MyButton"  (unaffected)
```

`rawName` is the only name property that always reflects the source. This allows rules that care about the original tag name (e.g., naming convention rules) to still access it.

### Attribute Access

| Method/Property               | Pretender behavior                                                                        |
| ----------------------------- | ----------------------------------------------------------------------------------------- |
| `attributes`                  | Returns the **virtual element's** attributes (deduplicated)                               |
| `getAttributeTokens()`        | Returns the **virtual element's** attribute tokens                                        |
| `getAttribute(name)`          | Searches the **virtual element's** attributes                                             |
| `hasAttribute(name)`          | Delegates to `getAttribute` on the **virtual element**                                    |
| `getAttributePretended(name)` | **Ignores** pretender context; searches the **original** element's `#attributes` directly |

`getAttributePretended()` is specifically designed for the accessible name computation: when a pretender's `aria.name` specifies `{ fromAttr: "label" }`, the system needs to read the `label` attribute from the original `<MyButton label="Save">`, not from the virtual `<button>`.

### Rule Configuration

The `rule` getter has special delegation in the **opposite direction**:

```typescript
// On the virtual element (type === 'origin'):
get rule() {
  return this.pretenderContext.origin.rule;  // Delegate to the original
}
```

This means when a rule accesses `element.rule` on the virtual element, it gets the rule configuration from the original element. This is because rules are mapped to nodes by selector matching, and the rule mapping targets the original elements (which exist in the document's `nodeList`), not the virtual elements.

## Selector Matching

### Two-Phase Matching

`matchMLSelector()` implements a two-phase strategy for pretender elements:

```
Phase 1: Match as the pretender identity
  selector "button"  →  match against <button> (virtual)  →  HIT

Phase 2: Match as the original identity (only if Phase 1 missed)
  selector "MyButton"  →  temporarily null out pretenderContext
                        →  match against <MyButton> (original)  →  HIT
                        →  restore pretenderContext
```

This ensures both targeting strategies work:

- **`button`** matches: rules that target the semantic element (e.g., ARIA rules for `<button>`)
- **`MyButton`** matches: rules that target the component (e.g., `nodeRules` for `MyButton`)

### Impact on Rule Mapping

Since `matchMLSelector()` is used by `RuleMapper` during the rule mapping phase, pretender-aware matching means:

- A `nodeRules` entry with `selector: "button"` will match `<MyButton>` if it pretends to be `<button>`
- A `nodeRules` entry with `selector: "MyButton"` will also match, because Phase 2 falls back to the original identity

## Accessible Name Computation

The `getAccname()` helper integrates with the pretender system via `getAccnameFromPretender()`:

```
getAccname(element)
  ├── 1. Try @markuplint/ml-spec get() (standard ARIA computation)
  ├── 2. Try getAccnameFromPretender(element)       ← Pretender-specific
  │     └── If pretenderContext.type === 'pretender'
  │         and pretenderContext.aria?.name exists:
  │           ├── aria.name === true → "some-name(Pretender Options)"
  │           └── aria.name === { fromAttr: "label" }
  │               → el.getAttributePretended("label")
  │               → reads from the ORIGINAL element's attributes
  ├── 3. Check aria-hidden/hidden → ""
  ├── 4. Check accessibleNameFromContent → recursive child text
  └── 5. Default → ""
```

The key design choice is that `getAccnameFromPretender()` calls `el.getAttributePretended(attrName)` — **not** `el.getAttribute(attrName)` — to read the attribute from the original element, bypassing the pretender context. This is because the `label` attribute exists on `<MyButton label="Save">`, not on the virtual `<button>`.

## Effect on `toString(fixed)`

When `fixed=true`, `MLElement.toString()` returns the **raw source** for pretender elements:

```typescript
if (this.pretenderContext?.type === 'pretender') {
  return this.raw;
}
```

This is correct because the pretender is a virtual construct — there is no source code to "fix" for the pretender identity. The original tag `<MyButton>` should remain unchanged in the output.

## Effect on `walkOn()`

Virtual elements created by the pretender system are **not** in the document's `nodeList`. Only the original elements (`<MyButton>`) are walked. Since `localName`, `nodeName`, and other properties delegate to the pretender, rules see the pretender identity when accessing the walked element.

```
document.walkOn('Element', el => {
  // el is <MyButton>, but:
  // el.localName === "button"    (from pretender)
  // el.rawName === "MyButton"    (from original)
  // el.attributes includes inherited + configured attrs
});
```

## Data Flow Diagram

```
Configuration (pretenders array)
        │
        ▼
MLDocument._pretending()
        │
        ▼ (for each element in nodeList)
MLElement.pretending()
        │
        ├─ Find matching config by selector
        ├─ Fallback: non-HTML element with `as` attribute
        │
        ▼
Create virtual MLElement
        │
        ├─ Tag name, namespace from config
        ├─ Attributes: inheritAttrs + explicit attrs
        └─ Children: shared with original
        │
        ▼
Bidirectional link
        │
        ├─ Original.pretenderContext = { type: 'pretender', as: virtual, aria }
        └─ Virtual.pretenderContext  = { type: 'origin', origin: original }
        │
        ▼
Property delegation active
        │
        ├─ localName, nodeName, tagName → virtual
        ├─ attributes, getAttributeTokens() → virtual
        ├─ rawName, fixedNodeName → original (unaffected)
        ├─ matchMLSelector() → two-phase (virtual first, then original)
        ├─ rule (on virtual) → delegates to original
        ├─ getAccname() → pretender ARIA config → getAttributePretended()
        └─ toString(fixed) → raw (no fix applied)
```
