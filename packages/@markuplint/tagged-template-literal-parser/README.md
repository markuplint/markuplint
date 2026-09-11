# @markuplint/tagged-template-literal-parser

[![npm version](https://badge.fury.io/js/%40markuplint%2Ftagged-template-literal-parser.svg)](https://www.npmjs.com/package/@markuplint/tagged-template-literal-parser)

Use **markuplint** with [**tagged template literals**](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Template_literals#tagged_templates) containing HTML, such as those used by [lit-html](https://lit.dev/docs/templates/overview/), [lit-element](https://lit.dev/docs/components/rendering/), and similar libraries.

## Install

```shell
$ npm install -D @markuplint/tagged-template-literal-parser

$ yarn add -D @markuplint/tagged-template-literal-parser
```

## Usage

Add `parser` option to your [configuration](https://markuplint.dev/configuration/#properties/parser).

```json
{
  "parser": {
    "\\.ts$": "@markuplint/tagged-template-literal-parser"
  }
}
```

This parser extracts HTML from tagged template literals like:

```ts
import { html } from 'lit';

const greeting = html` <h1>Hello ${name}</h1> `;
```

The `${...}` expressions are treated as opaque blocks and preserved in the AST as `#ps:ttl-expression` nodes.

## Supported Tag Names

By default, this parser recognizes template literals tagged with `html`. Member expression tags are also supported (e.g., `LitElement.html`).

### Custom Tag Names

To support additional tag names (e.g., `svg`), import the `TaggedTemplateLiteralParser` class and create a custom instance:

```ts
import { TaggedTemplateLiteralParser } from '@markuplint/tagged-template-literal-parser';

const parser = new TaggedTemplateLiteralParser(['html', 'svg']);
```

## :warning: Known Limitations

- **Nested `}` in expressions**: The `${...}` masking uses a simple start/end delimiter match. Expressions containing unmatched `}` characters (e.g., `${{ key: value }}`) may be incorrectly split.
- **Unquoted attribute values with expressions**: Template expressions inside unquoted attribute values are not supported. This is a shared limitation across all template engine parsers.
- **`.tsx` files**: This parser uses `jsx: false` when parsing TypeScript. Files containing JSX syntax (`.tsx`) may fail to parse. Use `@markuplint/jsx-parser` for JSX/TSX files instead.
