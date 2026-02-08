# Selector Matching

Detailed documentation of the two selector matching systems in `@markuplint/selector`.

## Overview

The package provides two independent matching systems:

1. **CSS Selector Matching** -- Standard CSS selectors parsed via `postcss-selector-parser`
2. **Regex Selector Matching** -- Pattern-based matching using regular expressions

Both systems return specificity information and can be used through the unified `matchSelector()` function.

## CSS Selector Matching Flow

### 1. Entry Point

```
createSelector(selectorString, specs?)
  → new Selector(selectorString, extendedPseudoClasses)
    → Ruleset.parse(selectorString, extended)
      → postcss-selector-parser processes the string
      → Returns parser.Selector[] AST nodes
```

### 2. Parsing

`Ruleset.parse()` uses `postcss-selector-parser` to parse the selector string into an AST. Each comma-separated selector becomes a `parser.Selector` node. The `Ruleset` wraps each one in a `StructuredSelector`.

### 3. StructuredSelector Chain Building

Each `StructuredSelector` walks the AST nodes and builds a chain of `SelectorTarget` objects linked by combinators:

```
div > .class:not(.other) span
  → SelectorTarget("div") → child combinator →
    SelectorTarget(".class:not(.other)") → descendant combinator →
      SelectorTarget("span")
```

The chain is built left-to-right from the AST but matched right-to-left (starting from the current element).

### 4. SelectorTarget Matching

Each `SelectorTarget` matches its compound selector components in this order:

1. **Namespace check** -- If present, validates the element's namespace (only `svg` and `*` are supported)
2. **ID selector** (`#id`) -- Matches `el.id`, specificity `[1, 0, 0]`
3. **Tag selector** (`div`) -- Matches `el.localName` (case-insensitive for pure HTML elements), specificity `[0, 0, 1]`. Universal selector (`*`) is handled as a tag type but adds no specificity.
4. **Class selector** (`.class`) -- Matches `el.classList`, specificity `[0, 1, 0]`
5. **Attribute selector** (`[attr=val]`) -- Matches element attributes with operator support, specificity `[0, 1, 0]`
6. **Pseudo-class** (`:not()`, `:has()`, etc.) -- Dispatched to specialized handlers

If any component fails to match, the entire `SelectorTarget` fails (early termination).

### 5. Combinator Matching

When a `SelectorTarget` matches, the `StructuredSelector` follows the combinator to the next target:

| Combinator         | Symbol      | DOM Traversal                                    |
| ------------------ | ----------- | ------------------------------------------------ |
| Descendant         | ` ` (space) | Walk up through `parentElement` chain            |
| Child              | `>`         | Check immediate `parentElement`                  |
| Next-sibling       | `+`         | Check `previousElementSibling`                   |
| Subsequent-sibling | `~`         | Walk back through `previousElementSibling` chain |

## Pseudo-Class Handling

### Standard Pseudo-Classes

| Pseudo-Class       | Behavior                                                                               |
| ------------------ | -------------------------------------------------------------------------------------- |
| `:not(selector)`   | Matches if the inner selector does NOT match. Specificity equals the inner selector's. |
| `:is(selector)`    | Matches if ANY inner selector matches. Specificity equals the most specific match.     |
| `:where(selector)` | Same as `:is()` but always contributes `[0, 0, 0]` specificity.                        |
| `:has(selector)`   | Matches if a descendant (or sibling with `+`/`~` combinator) matches.                  |
| `:scope`           | Matches the scope element (or root if no scope). Specificity `[0, 1, 0]`.              |
| `:root`            | Matches the `<html>` element. Specificity `[0, 1, 0]`.                                 |

### Custom: `:closest(selector)`

Walks up the ancestor chain and matches if any ancestor matches the inner selector. This is a markuplint extension not in the W3C specification.

### Extended Pseudo-Classes

Extended pseudo-classes are dispatched through the `ExtendedPseudoClass` registry:

#### `:aria(syntax)`

| Syntax        | Behavior                                               |
| ------------- | ------------------------------------------------------ |
| `has name`    | Matches if `getAccname(el)` returns a non-empty string |
| `has no name` | Matches if `getAccname(el)` returns an empty string    |

Supports version syntax: `:aria(has name|1.2)` (version parameter is parsed but not yet used for filtering).

#### `:role(roleName)` / `:role(roleName|version)`

Matches if `getComputedRole(specs, el, version)` returns a role whose `name` equals the specified `roleName`. The version defaults to `ARIA_RECOMMENDED_VERSION`.

#### `:model(category)`

Matches if the element belongs to the specified HTML content model category. Uses `contentModelCategoryToTagNames()` to get the list of matching selectors for the category, then tests each against the element.

Special cases:

- `#custom` -- Matches custom elements (elements with `isCustomElement` property)
- `#text` -- Always returns unmatched (text nodes are not elements)

## Regex Selector Matching Flow

### 1. Entry Point

```
matchSelector(el, regexSelector)
  → regexSelect(el, regexSelector)
    → Builds SelectorTarget chain from combination links
    → Matches from the edge (deepest combination) back to root
```

### 2. SelectorTarget Chain Building

The `RegexSelector` type supports chained combinations:

```typescript
{
  nodeName: "/^div$/",
  combination: {
    combinator: ">",
    nodeName: "/^span$/",
    combination: {
      combinator: "+",
      attrName: "/^data-/"
    }
  }
}
```

This builds a chain: `SelectorTarget(div) → > → SelectorTarget(span) → + → SelectorTarget([data-*])`.

### 3. Pattern Matching

`regexSelectorMatches(pattern, value, ignoreCase)` handles pattern matching:

- **Plain string**: Wrapped as `^pattern$` (exact match)
- **Regex literal** (`/pattern/flags`): Used as-is with the specified flags
- **Case sensitivity**: HTML elements use case-insensitive matching (`ignoreCase = true` when `isPureHTMLElement()`)

### 4. Regex Combinators

Standard CSS combinators are supported, plus two extra:

| Combinator           | Symbol      | DOM Traversal                                    |
| -------------------- | ----------- | ------------------------------------------------ |
| Descendant           | `' '`       | Walk up `parentElement` chain                    |
| Child                | `'>'`       | Check immediate `parentElement`                  |
| Next-sibling         | `'+'`       | Check `previousElementSibling`                   |
| Subsequent-sibling   | `'~'`       | Walk back through `previousElementSibling` chain |
| Prev-sibling         | `':has(+)'` | Check `nextElementSibling`                       |
| Subsequent (forward) | `':has(~)'` | Walk forward through `nextElementSibling` chain  |

### 5. Data Capture

Matched regex capture groups are collected into a `data` object:

```typescript
// Pattern: "/^(?<prefix>[a-z]+)-(?<suffix>[a-z]+)$/"
// Value: "data-value"
// Result: { $0: "data-value", $1: "data", $2: "value", prefix: "data", suffix: "value" }
```

The `$0` capture from `nodeName` matching is deleted (it's the full match, redundant with the element name). Data from all targets in the chain is merged.

### 6. Specificity Calculation

Regex selector specificity is calculated per target:

- `nodeName` match: `[0, 0, 1]` (type specificity)
- Each matched attribute: `[0, 1, 0]` (class-level specificity)
- Specificity from combined targets is summed

## Caching

`createSelector()` maintains a `Map<string, Selector>` cache. Subsequent calls with the same selector string return the same `Selector` instance, avoiding repeated parsing by `postcss-selector-parser`.

## Supported vs Unsupported Selectors

### Supported

- Universal (`*`), type (`div`), ID (`#id`), class (`.class`)
- All attribute selector operators (`=`, `~=`, `|=`, `*=`, `^=`, `$=`, case-insensitive `i` flag)
- Combinators: descendant (` `), child (`>`), next-sibling (`+`), subsequent-sibling (`~`)
- Multiple selectors (`,`)
- `:not()`, `:is()`, `:where()`, `:has()`, `:scope`, `:root`
- `:closest()` (markuplint extension)
- Extended: `:aria()`, `:role()`, `:model()`
- Namespace selectors (`svg|text`, `*|div`). Note: only `svg` and `*` namespaces are supported; other namespaces (e.g., `html`) throw `InvalidSelectorError`.

### Unsupported (throws error)

Structural pseudo-classes: `:empty`, `:nth-child()`, `:nth-last-child()`, `:first-child`, `:last-child`, `:only-child`, `:nth-of-type()`, `:nth-last-of-type()`, `:first-of-type`, `:last-of-type`, `:only-of-type`, `:nth-col()`, `:nth-last-col()`

Input pseudo-classes: `:enable`, `:disable`, `:read-write`, `:read-only`, `:placeholder-shown`, `:default`, `:checked`, `:indeterminate`, `:valid`, `:invalid`, `:in-range`, `:out-of-range`, `:required`, `:optional`, `:blank`, `:user-invalid`

### Ignored (throws error)

User interaction / dynamic pseudo-classes: `:dir()`, `:lang()`, `:any-link`, `:link`, `:visited`, `:local-link`, `:target`, `:target-within`, `:current`, `:past`, `:future`, `:active`, `:hover`, `:focus`, `:focus-within`, `:focus-visible`

Pseudo-elements: `::before`, `::after`

Column combinator: `||`
