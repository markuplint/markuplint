---
sidebar_position: 3
title: 'MLDOM'
---

# MLDOM

The classes of MLDOM (`MLElement`, `MLNode`, `MLAttr`, `MLDocument`, …) in `@markuplint/ml-core` no longer implement the standard DOM interfaces (`Element`, `Node`, `Document`, `Attr`, `NamedNodeMap`, `DOMTokenList`, …). They keep only the members that the rules and the selector engine read, so an MLDOM object is no longer assignable to the DOM's `Element` or `Node`.

This is not a change for a config. It affects code that reads MLDOM through `@markuplint/ml-core`, `@markuplint/ml-spec` or `@markuplint/selector`.

## Removed {#removed}

- Every member that only threw `UnexpectedCallError` (mutation, events, layout, `before()` / `after()` / `remove()` and the like).
- The members that nothing in the monorepo read: `getElementsByTagName()`, `getElementsByClassName()`, `firstElementChild`, `lastElementChild`, `assignedNodes()`, `assignedSlot`, `getAttributeNames()` and `hasAttributes()`. Read `childElements`, `getAssignedNodes()` and `getFlatTreeSlot()` instead.
- `lastChild` of `MLNode`, `defaultView` of `MLDocument`, and the `DOCUMENT_POSITION_*`, `ENTITY_NODE`, `ENTITY_REFERENCE_NODE`, `NOTATION_NODE` and `PROCESSING_INSTRUCTION_NODE` constants of `MLNode`.
- `UnexpectedCallError` of `@markuplint/shared`.
- `getAccname()` of `@markuplint/ml-spec`, which computed the accessible name of a DOM `Element`. Read `getAccessibleName()` of `MLElement`; `:aria(has name)` of `@markuplint/selector` calls it.

## Renamed {#renamed}

The remaining members follow the naming of the Rust DOM (`crates/markuplint-dom`).

| v5                                                        | v6                    |
| --------------------------------------------------------- | --------------------- |
| `children` (the child elements)                           | `childElements`       |
| `getAttribute(name)`                                      | `getAttrValue(name)`  |
| `getAttributeNode(name)`                                  | `getAttrNode(name)`   |
| `hasAttribute(name)`                                      | `hasAttr(name)`       |
| `getElementById(id)` of a document or a document fragment | `findElementById(id)` |
| `previousElementSibling`                                  | `prevElementSibling`  |
| `previousSibling`                                         | `prevSibling`         |
| `parentNode`                                              | `parent`              |
| `getPureChildNodes()`                                     | `pureChildren()`      |

`nextElementSibling`, `parentElement`, `childNodes`, `textContent`, `localName` and the rest keep their names. `MLToken` (`startLine`, `startCol`, `startOffset`, `raw`) is not changed.

## Types {#types}

- The functions of `@markuplint/ml-spec` that took the DOM's `Element` (`getComputedRole()`, `getImplicitRole()`, `isExposed()`, …) take `SpecElement`, a type that lists what they read. `ComputedRole#el` is a `SpecElement`.
- The functions of `@markuplint/ml-spec` read `SpecElement` and those of `@markuplint/selector` read `SelectorElement`. Both interfaces use the names of the table (`getAttrValue()`, `hasAttr()`, `childElements`, `parent`, `prevSibling`, `prevElementSibling`, `findElementById()`), so a DOM `Element` is not accepted by them as it is. `AccnameElement` of `@markuplint/ml-spec` is the same.
- `NodeListOf` and `HTMLCollectionOf` are no longer returned: `childNodes` and `querySelectorAll()` return `MLNodeList`, `childElements` returns `MLHTMLCollection`.

## What to do {#what-to-do}

1. Rename the members above in code that reads MLDOM.
2. If you passed a DOM `Element` of a browser or JSDOM to a function of `@markuplint/ml-spec` or `@markuplint/selector`, define the accessors of the table on its prototypes, or wrap the element: the functions read `SpecElement` / `SelectorElement`, not the DOM's `Element`.
3. Remove the `catch` of `UnexpectedCallError`, if any.
