# MLElement

**Source:** `src/ml-dom/node/element.ts`

HTML/SVG/MathML element node. Extends `MLParentNode` and implements `Element`, `HTMLElement`, and `HTMLOrSVGElement`. This is the most feature-rich class in the MLDOM hierarchy.

## Name Properties

The element has multiple name-related properties that serve different purposes:

| Property        | HTML `<DIV>`                   | SVG `<foreignObject>` | Pretender (`MyButton` → `button`) |
| --------------- | ------------------------------ | --------------------- | --------------------------------- |
| `localName`     | `"div"`                        | `"foreignObject"`     | `"button"`                        |
| `nodeName`      | `"DIV"`                        | `"foreignObject"`     | `"BUTTON"`                        |
| `rawName`       | `"DIV"`                        | `"foreignObject"`     | `"MyButton"`                      |
| `fixedNodeName` | `"DIV"` (or `"div"` after fix) | `"foreignObject"`     | `"MyButton"`                      |
| `tagName`       | `"DIV"`                        | `"foreignObject"`     | `"BUTTON"`                        |

**Rules:**

- **`localName`**: HTML elements → lowercased. Foreign elements or non-`'html'` elementType → as-is. Pretender context → pretender's `localName`. If `tagNameCaseSensitive` is `true` → no lowercasing.
- **`nodeName`**: HTML elements → uppercased (DOM convention). Foreign elements or non-`'html'` elementType → as-is from AST. Pretender context → pretender's `nodeName`.
- **`rawName`**: Always the original AST `nodeName`, with no normalization and no pretender influence.
- **`fixedNodeName`**: Starts as `rawName`. Updated by `fixNodeName(name)` when a lint fix modifies the tag name.
- **`tagName`**: Same as `nodeName` (follows pretender context).

## Element Type Resolution

| `elementType`     | Condition                                                  | Examples                    |
| ----------------- | ---------------------------------------------------------- | --------------------------- |
| `'html'`          | Standard HTML element (known tag in HTML namespace)        | `<div>`, `<span>`, `<p>`    |
| `'web-component'` | Tag name contains a hyphen (Custom Element convention)     | `<my-component>`, `<x-app>` |
| `'authored'`      | Non-standard tag name without hyphen (framework component) | `<MyComponent>` (JSX)       |

The `elementType` is determined by the parser at AST creation time and stored as `astNode.elementType`.

## Attribute Access

### `attributes` (MLNamedNodeMap)

The `attributes` getter returns a deduplicated `MLNamedNodeMap`:

1. Select the attribute source: if in pretender context (`type === 'pretender'`), use the pretender element's attributes; otherwise, use the original attributes
2. Deduplicate by name: iterate the attributes, keeping only the first occurrence of each name (per the [HTML parse error: duplicate-attribute](https://html.spec.whatwg.org/#parse-error-duplicate-attribute) spec)
3. Wrap in `MLNamedNodeMap` and cache the result

### Attribute Methods

| Method                  | Signature                                             | Description                                                                            |
| ----------------------- | ----------------------------------------------------- | -------------------------------------------------------------------------------------- |
| `getAttribute`          | `getAttribute(name: string): string \| null`          | Case-insensitive name lookup, returns the first matching attribute's `value`           |
| `getAttributeToken`     | `getAttributeToken(name: string): MLAttr[]`           | Returns **all** `MLAttr` tokens matching the name (handles duplicate attributes)       |
| `getAttributeTokens`    | `getAttributeTokens(): ReadonlyArray<MLAttr>`         | All attribute tokens (pretender context → pretender's attributes)                      |
| `getAttributePretended` | `getAttributePretended(name: string): string \| null` | Gets attribute value from the **original** element, **ignoring** the pretender context |
| `hasAttribute`          | `hasAttribute(name: string): boolean`                 | Case-insensitive existence check (delegates to `getAttribute`)                         |

### `hasMutableAttributes()`

Returns `true` if any attribute is non-deterministic:

- An attribute has no `nameNode` (i.e., it's a spread attribute like `{...props}`)
- An attribute has `isDynamicValue === true` (e.g., template expression)

Rules use this to detect that the attribute set is not fully known at static analysis time.

## Selector Matching

### `matches(selector, scope?)`

Returns `boolean`. Delegates to `matchMLSelector()` and checks `matched`.

### `matchMLSelector(selector, scope?)`

Extended selector matching supporting both CSS selector strings and `RegexSelector` objects. Returns `SelectorMatches` (match result with specificity and regex capture data).

**Two-phase matching for pretender elements:**

1. If the element has a pretender context (`type === 'pretender'`):
   - First, match **as the pretender** (e.g., as `<button>`)
   - If the pretender matches → return the result
2. If the pretender did not match:
   - Temporarily set `pretenderContext` to `null`
   - Match **as the original element** (e.g., as `<MyButton>`)
   - Restore the `pretenderContext`
   - Return the result

This ensures that rules targeting `button` match the pretender, while rules targeting `MyButton` still match the original.

### `closest(selectors)`

Walks up the `parentElement` chain from `this`, returning the first element where `matches(selectors)` is `true`.

## Pretender System

For comprehensive documentation on the pretender system's architecture, initialization flow, property delegation, and accessible name integration, see the dedicated [Pretender System](./pretender.md) reference.

## Other Methods

| Method                   | Signature                                         | Description                                                                                                  |
| ------------------------ | ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `fixNodeName`            | `fixNodeName(name: string): void`                 | Updates `fixedNodeName` for lint auto-fix of the tag name                                                    |
| `getAccessibleName`      | `getAccessibleName(version: ARIAVersion): string` | Computes the accessible name via `getAccname()`                                                              |
| `toNormalizeString`      | `toNormalizeString(): string`                     | Returns a normalized representation for comparison (cached). Recursively normalizes children and attributes. |
| `nextElementSibling`     | `get nextElementSibling: MLElement \| null`       | Next sibling element                                                                                         |
| `previousElementSibling` | `get previousElementSibling: MLElement \| null`   | Previous sibling element                                                                                     |

## Mutable Children Detection

### `hasMutableChildren(attr?)`

Returns `true` if the element's children are non-deterministic. Iterates `getPureChildNodes()`:

- An `MLBlock` child exists **without** a `conditionalType` (i.e., `conditionalType` is `null` -- blocks with recognized conditional types like `'if'`, `'each'` are skipped because they are handled by `conditionalChildNodes()`)
- A `<slot>` child element exists (content is injected at runtime)
- If `attr` is `true`: any child element has `hasMutableAttributes() === true`
- Recursively checks `hasMutableChildren()` on child elements

This is used by rules like `permitted-contents` to decide whether to skip validation when the children are unpredictable.

## `getChildElementsAndTextNodeWithoutWhitespaces()`

Returns a flat array of `MLElement | MLText` (non-whitespace) children, with omitted elements flattened:

1. Iterate `childNodes`
2. For elements: if `isOmitted`, recursively get their children and include them instead (flattening)
3. For text nodes: include only if not whitespace
4. Result is cached

This is used for content model validation -- omitted elements like an implicit `<tbody>` are transparent for content model purposes.

## Omitted (Ghost) Elements

Elements with `isOmitted === true` were implicitly inserted by the parser (e.g., HTML parser inserting an omitted `<tbody>`). These elements:

- Have no corresponding source tokens
- Are skipped by `prevToken` (to maintain valid offset chains)
- Return `raw` from `toString(fixed)` (no fix is applied since there's nothing in the source to fix)
- Are flattened by `getChildElementsAndTextNodeWithoutWhitespaces()`

## Close Tag

| Property             | Type                        | Description                                                                                      |
| -------------------- | --------------------------- | ------------------------------------------------------------------------------------------------ |
| `closeTag`           | `MLElementCloseTag \| null` | Paired close tag. `null` for void elements, self-closing elements, or when `endTag === 'never'`. |
| `selfClosingSolidus` | `MLToken \| null`           | The `/` token in `<br />`. `null` if not self-closing.                                           |

## `toString(fixed?)`

Reconstructs the element's source string with fixes applied.

- `fixed=false` or pretender/omitted/`#`-prefixed nodeName → return `raw`
- `fixed=true`:
  1. Build a list of replaceable nodes: `[tagOpenChar + fixedNodeName, ...overriddenCommentNodes, ...attributes]`
  2. For each node, splice `node.toString(true)` at the correct offset
  3. Track cumulative offset differences for accurate positioning

```
Original: <DIV class="foo" >
Fixed:    <div class="foo" >
          ^^^^              (fixedNodeName changed from "DIV" to "div")
```

## Other Properties

| Property           | Type             | Description                                   |
| ------------------ | ---------------- | --------------------------------------------- |
| `namespaceURI`     | `NamespaceURI`   | Element namespace (HTML, SVG, MathML)         |
| `isForeignElement` | `boolean`        | `true` for SVG/MathML elements                |
| `elementType`      | `ElementType`    | `'html'` \| `'web-component'` \| `'authored'` |
| `isOmitted`        | `boolean`        | `true` for implicitly inserted elements       |
| `classList`        | `MLDomTokenList` | CSS class list from `class` attribute         |
| `className`        | `string`         | Class attribute value                         |
| `id`               | `string`         | ID attribute value (empty string if absent)   |
| `hasSpreadAttr`    | `boolean`        | Whether element has spread attributes         |
| `tagOpenChar`      | `string`         | Opening tag delimiter (e.g., `<` or `<%`)     |
| `tagCloseChar`     | `string`         | Closing tag delimiter (e.g., `>` or `%>`)     |
