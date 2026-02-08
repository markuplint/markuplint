# Other Node Types

For MLBlock documentation, see the dedicated [MLBlock](./block.md) reference.

## MLCharacterData (abstract)

**Source:** `src/ml-dom/node/character-data.ts`

Abstract base class for text content nodes. Implements DOM `CharacterData` interface.

| Property                 | Type                | Description                                      |
| ------------------------ | ------------------- | ------------------------------------------------ |
| `data`                   | `string`            | Character data content (currently returns `raw`) |
| `nodeValue`              | `string \| null`    | Same as `data`                                   |
| `textContent`            | `string`            | Same as `data`                                   |
| `nextElementSibling`     | `MLElement \| null` | Next sibling element                             |
| `previousElementSibling` | `MLElement \| null` | Previous sibling element                         |

Methods: `after()`, `before()`, `remove()`, `replaceWith()`.

## MLText

**Source:** `src/ml-dom/node/text.ts`

Text node. Extends `MLCharacterData` and implements DOM `Text`.

- `nodeName`: `'#text'`
- `nodeType`: `3` (`TEXT_NODE`)

| Method                      | Returns   | Description                                         |
| --------------------------- | --------- | --------------------------------------------------- |
| `isWhitespace()`            | `boolean` | `true` if text matches `/^\s+$/`                    |
| `isRawTextElementContent()` | `boolean` | `true` if parent element is `<script>` or `<style>` |

## MLComment

**Source:** `src/ml-dom/node/comment.ts`

Comment node. Extends `MLCharacterData` and implements DOM `Comment`.

- `nodeName`: `'#comment'`
- `nodeType`: `8` (`COMMENT_NODE`)
- `textContent`: Returns the comment's `data`

## MLDocumentType

**Source:** `src/ml-dom/node/document-type.ts`

DOCTYPE node. Extends `MLNode` and implements DOM `DocumentType`.

- `nodeType`: `10` (`DOCUMENT_TYPE_NODE`)
- `nodeName`: Same as `name`
- `textContent`: Always `null`

| Property   | Type     | Description                         |
| ---------- | -------- | ----------------------------------- |
| `name`     | `string` | Document type name (e.g., `"html"`) |
| `publicId` | `string` | Public identifier, or empty string  |
| `systemId` | `string` | System identifier, or empty string  |

## MLElementCloseTag

**Source:** `src/ml-dom/node/element-close-tag.ts`

Close tag paired with its corresponding open tag element. Extends `MLNode`. Close tags are **not** part of the document `nodeList`; they exist only as satellites of their paired `MLElement`.

MLElementCloseTag exists for two purposes:

1. **Syntax location tracking**: It records the source position (`startLine`, `startCol`, `raw`, etc.) of the close tag. Rules like `case-sensitive-tag-name` use this to report violations at the exact close tag location rather than the open tag.
2. **Presence/absence detection**: `MLElement.closeTag` is `null` when no close tag exists. Rules like `end-tag` check `el.closeTag != null` to detect missing close tags (omissions or errors) on non-void elements.

### Properties

| Property   | Type        | Description                                           |
| ---------- | ----------- | ----------------------------------------------------- |
| `pair`     | `MLElement` | The corresponding opening element                     |
| `rawName`  | `string`    | Tag name as written in source (from AST `nodeName`)   |
| `nodeName` | `string`    | Tag name derived from the paired element's `nodeName` |

### Usage in Rules

```typescript
// end-tag rule: detect missing close tags
if (el.closeTag != null) {
  return; // close tag exists → OK
}
report({ scope: el, message: t('Missing {0}', t('the {0}', 'end tag')) });

// case-sensitive-tag-name rule: report at the close tag's source position
const closeTag = el.closeTag;
if (closeTag && deny.test(closeTag.raw)) {
  report({
    scope: {
      rule: el.rule,
      startLine: closeTag.startLine,
      startCol: closeTag.startCol,
      raw: closeTag.raw,
    },
    message,
  });
}
```

### `toString(fixed?)`

When `fixed=true`:

- If the element is a virtual element (starts with `#`) or is omitted → returns `raw`
- Otherwise: reconstructs `tagOpenChar` + `/` + tag name + `tagCloseChar` using the pair's delimiters. The tag name is determined as: if `pair.fixedNodeName === pair.rawName` (no fix applied), use `this.rawName`; otherwise use `pair.fixedNodeName`

## MLDocumentFragment

**Source:** `src/ml-dom/node/document-fragment.ts`

Fragment root node for JSX fragments (`<>...</>`) and similar constructs. Extends `MLParentNode` and implements DOM `DocumentFragment`.

- `nodeName`: `'#document-fragment'`
- `nodeType`: `11` (`DOCUMENT_FRAGMENT_NODE`)
- `textContent`: Concatenation of all child nodes' text content
