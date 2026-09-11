# @markuplint/markdown-parser

[![npm version](https://badge.fury.io/js/%40markuplint%2Fmarkdown-parser.svg)](https://www.npmjs.com/package/@markuplint/markdown-parser)

Use **markuplint** with **Markdown** files.

Converts Markdown constructs (headings, links, images, lists, tables, etc.) to their corresponding HTML elements so that markuplint rules can analyze them. Supports [GFM](https://github.github.com/gfm/) (tables, strikethrough, autolinks) and YAML frontmatter.

## Install

```shell
$ npm install -D @markuplint/markdown-parser

$ yarn add -D @markuplint/markdown-parser
```

## Usage

Add `parser` option to your [configuration](https://markuplint.dev/configuration/#properties/parser).

```json
{
  "parser": {
    ".md$": "@markuplint/markdown-parser"
  }
}
```

## Supported Syntax

| Markdown                      | HTML                           |
| ----------------------------- | ------------------------------ |
| `# Heading`                   | `<h1>` – `<h6>`                |
| `[text](url)` / `[text][ref]` | `<a href="...">`               |
| `![alt](url)` / `![alt][ref]` | `<img src="..." alt="...">`    |
| `- item` / `1. item`          | `<ul>` / `<ol>` with `<li>`    |
| `` `code` ``                  | `<code>`                       |
| Fenced code block             | `<pre><code>`                  |
| `> quote`                     | `<blockquote>`                 |
| GFM table                     | `<table>` with `<th>` / `<td>` |
| `~~text~~`                    | `<del>`                        |
| `---`                         | `<hr>`                         |
| Raw HTML                      | Parsed as HTML                 |

## Known Limitations

- **Synthesized attribute positions**: Attributes derived from Markdown syntax (e.g., `href` from `[text](url)`) share the source position of the enclosing Markdown construct rather than pointing to the exact character range of the attribute value.
