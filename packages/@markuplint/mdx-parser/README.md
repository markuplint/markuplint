# @markuplint/mdx-parser

[![npm version](https://badge.fury.io/js/%40markuplint%2Fmdx-parser.svg)](https://www.npmjs.com/package/@markuplint/mdx-parser)

Use **markuplint** with [**MDX**](https://mdxjs.com/) files.

Parses JSX elements, expressions, and imports alongside standard Markdown content. Markdown constructs are converted to their corresponding HTML elements so that markuplint rules can analyze them. Supports [GFM](https://github.github.com/gfm/) (tables, strikethrough, autolinks) and YAML frontmatter.

## Install

```shell
$ npm install -D @markuplint/mdx-parser

$ yarn add -D @markuplint/mdx-parser
```

## Usage

Add `parser` and `specs` options to your [configuration](https://markuplint.dev/configuration/#properties/parser).

```json
{
  "parser": {
    ".mdx$": "@markuplint/mdx-parser"
  },
  "specs": {
    ".mdx$": "@markuplint/react-spec"
  }
}
```

## Features

- **JSX elements**: Both self-closing (`<Badge />`) and container (`<Card>...</Card>`) components
- **IDL attribute conversion**: When paired with `@markuplint/react-spec`, React-style attributes (e.g., `className`, `htmlFor`) are mapped to their HTML equivalents
- **Expressions**: `{variable}` and `{condition ? a : b}` are treated as dynamic values
- **ESM imports/exports**: `import` and `export` statements are recognized as blocks
- **Markdown inside JSX**: Markdown content within JSX containers is recursively parsed

## Known Limitations

- **MDX v2/v3 only**: MDX v1 syntax is not supported.
- **Synthesized attribute positions**: Attributes derived from Markdown syntax (e.g., `href` from `[text](url)`) share the source position of the enclosing Markdown construct rather than pointing to the exact character range of the attribute value.
