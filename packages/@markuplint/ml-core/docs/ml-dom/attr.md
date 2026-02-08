# MLAttr

**Source:** `src/ml-dom/node/attr.ts`

Attribute node. Extends `MLNode` and implements the DOM `Attr` interface. Each attribute is decomposed into individual tokens for fine-grained inspection and fixing.

## Properties

| Property       | Type             | Description                                               |
| -------------- | ---------------- | --------------------------------------------------------- |
| `name`         | `string`         | Qualified attribute name (resolved from `#potentialName`) |
| `localName`    | `string`         | Local part of attribute name (without namespace prefix)   |
| `namespaceURI` | `string \| null` | Attribute namespace URI                                   |
| `value`        | `string`         | Attribute value (resolved from `#potentialValue`)         |
| `nodeValue`    | `string`         | Same as `value`                                           |
| `textContent`  | `string`         | Same as `value`                                           |
| `specified`    | `true`           | Always `true` (DOM `Attr` interface requirement)          |
| `ownerElement` | `MLElement`      | Element that owns this attribute                          |

## `#potentialName` / `#potentialValue`

The parser may provide resolved "potential" names and values for attributes where the source syntax differs from the effective semantics. For example, a template engine might transform attribute names or values.

- If `astToken.potentialName` exists → use it as `name`; otherwise use `nameNode.raw`
- If `astToken.potentialValue` exists → use it as `value`; otherwise use `valueNode.raw`

## Token Decomposition

Each attribute is decomposed into individual `MLToken` instances:

```
 ·class="container"
 ^     ^^         ^
 |     ||         └── endQuote (raw: '"')
 |     |└── valueNode (raw: 'container')
 |     └── startQuote (raw: '"')
 |        equal (raw: '=')
 └── spacesBeforeName (raw: ' ')
    nameNode (raw: 'class')
```

| Token Property      | Type              | Description                                       |
| ------------------- | ----------------- | ------------------------------------------------- |
| `spacesBeforeName`  | `MLToken \| null` | Whitespace before the attribute name              |
| `nameNode`          | `MLToken \| null` | Attribute name token (null for spread attributes) |
| `spacesBeforeEqual` | `MLToken \| null` | Whitespace between name and `=`                   |
| `equal`             | `MLToken \| null` | The `=` sign token                                |
| `spacesAfterEqual`  | `MLToken \| null` | Whitespace between `=` and value                  |
| `startQuote`        | `MLToken \| null` | Opening quote token                               |
| `valueNode`         | `MLToken \| null` | Attribute value token                             |
| `endQuote`          | `MLToken \| null` | Closing quote token                               |

## Spread Attributes

For spread attributes (e.g., `{...props}` in JSX), the `MLAttr` is created with minimal properties:

| Property             | Value                                        |
| -------------------- | -------------------------------------------- |
| `localName`          | `'#spread'`                                  |
| `valueType`          | `'code'`                                     |
| `isDirective`        | `true`                                       |
| `isDynamicValue`     | `true`                                       |
| `isDuplicatable`     | `true`                                       |
| All token properties | `null`                                       |
| `fix()`              | No-op (returns immediately)                  |
| `value`              | The raw source text of the spread expression |

## `tokenList` (MLDomTokenList)

Returns a `MLDomTokenList` for space-separated attribute values (e.g., `class` attribute):

- If `isDynamicValue` → returns `null` (cannot tokenize a dynamic expression)
- Otherwise → `new MLDomTokenList(this.value, [this])`

## `rule` Getter

Delegates to `ownerElement.rule` -- an attribute inherits its rule configuration from the element that owns it.

## Metadata Properties

| Property         | Type                                          | Description                                 |
| ---------------- | --------------------------------------------- | ------------------------------------------- |
| `isDynamicValue` | `true \| undefined`                           | Whether value contains a dynamic expression |
| `isDirective`    | `true \| undefined`                           | Whether attribute is a framework directive  |
| `isDuplicatable` | `boolean`                                     | Whether attribute may appear multiple times |
| `valueType`      | `'string' \| 'number' \| 'boolean' \| 'code'` | Value type classification                   |
| `candidate`      | `string \| undefined`                         | Fix candidate value suggested by the parser |

## Methods

| Method              | Signature                           | Description                                                                        |
| ------------------- | ----------------------------------- | ---------------------------------------------------------------------------------- |
| `fix`               | `fix(raw: string): void`            | Updates the `valueNode` fixed content. No-op for spread attributes.                |
| `toNormalizeString` | `toNormalizeString(): string`       | Normalized representation stripping extraneous whitespace                          |
| `toString`          | `toString(fixed?: boolean): string` | Raw or fixed string. For `fixed=true`, reconstructs from each token's fixed value. |
