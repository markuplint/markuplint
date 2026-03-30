# Vue project

Setting up Markuplint for a Vue project.

## What you need

Install Markuplint with the Vue parser and Vue spec:

```shell npm2yarn
npm install -D markuplint @markuplint/vue-parser @markuplint/vue-spec
```

## Configuration

```json class=config title=".markuplintrc"
{
  "extends": ["markuplint:recommended-vue"],
  "parser": {
    "\\.vue$": "@markuplint/vue-parser"
  },
  "specs": {
    "\\.vue$": "@markuplint/vue-spec"
  }
}
```

This configuration:

- Applies the **recommended-vue** preset (includes all base presets + Vue-specific rules like `no-hard-code-id`)
- Parses `.vue` files with the Vue parser
- Recognizes Vue-specific attributes and directives (`v-if`, `v-for`, `:key`, `@click`, etc.) via the Vue spec

## With Pretenders

If you want Markuplint to validate your custom components as if they were native HTML elements, add the [Pretenders](/docs/guides/beyond-html#pretenders) configuration. We recommend using **automatic scanning** — it discovers component-to-element mappings from your source files, so you don't need to maintain them manually:

```json class=config title=".markuplintrc"
{
  "extends": ["markuplint:recommended-vue"],
  "parser": {
    "\\.vue$": "@markuplint/vue-parser"
  },
  "specs": {
    "\\.vue$": "@markuplint/vue-spec"
  },
  "pretenders": {
    "scan": [
      {
        "files": "./src/components/**/*.vue"
      }
    ]
  }
}
```

:::tip
The `scan` feature was introduced in v5. It replaces the need to manually list every component mapping — just point it at your component directory and Markuplint handles the rest.
:::
