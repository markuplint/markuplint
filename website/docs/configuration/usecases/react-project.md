# React project

Setting up Markuplint for a React (JSX/TSX) project.

## What you need

Install Markuplint with the JSX parser and React spec:

```shell npm2yarn
npm install -D markuplint @markuplint/jsx-parser @markuplint/react-spec
```

## Configuration

```json class=config title=".markuplintrc"
{
  "extends": ["markuplint:recommended-react"],
  "parser": {
    "\\.[jt]sx$": "@markuplint/jsx-parser"
  },
  "specs": {
    "\\.[jt]sx$": "@markuplint/react-spec"
  }
}
```

This configuration:

- Applies the **recommended-react** preset (includes all base presets + React-specific rules like `no-hard-code-id`)
- Parses `.jsx` and `.tsx` files with the JSX parser
- Recognizes React-specific attributes (`key`, `className`, `htmlFor`, etc.) via the React spec

## With Pretenders

If you want Markuplint to validate your custom components as if they were native HTML elements, add the [Pretenders](/docs/guides/beyond-html#pretenders) configuration. We recommend using **automatic scanning** — it discovers component-to-element mappings from your source files, so you don't need to maintain them manually:

```json class=config title=".markuplintrc"
{
  "extends": ["markuplint:recommended-react"],
  "parser": {
    "\\.[jt]sx$": "@markuplint/jsx-parser"
  },
  "specs": {
    "\\.[jt]sx$": "@markuplint/react-spec"
  },
  "pretenders": {
    "scan": [
      {
        "files": "./src/components/**/*.tsx"
      }
    ]
  }
}
```

:::tip
The `scan` feature was introduced in v5. It replaces the need to manually list every component mapping — just point it at your component directory and Markuplint handles the rest.
:::
