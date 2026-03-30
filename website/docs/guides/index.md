# Guides

## Getting started

### The quickest way: VS Code extension

Install the [Markuplint extension](https://marketplace.visualstudio.com/items?itemName=yusukehirao.vscode-markuplint) from the Visual Studio Marketplace, or search "markuplint" in the VS Code extensions panel.

**That's it.** Open any HTML file and Markuplint starts checking in real time — no installation, no configuration file needed. It applies the [recommended preset](/docs/guides/presets) by default.

:::tip
VS Code-based editors such as [Cursor](https://www.cursor.com/) are also supported.
:::

### Using with a framework (React, Vue, etc.)

If your project uses **JSX, Vue, Svelte**, or other template syntaxes, you need to install Markuplint and a parser plugin into your project:

```shell npm2yarn
npm install -D markuplint @markuplint/jsx-parser @markuplint/react-spec
```

Then create a configuration file (`.markuplintrc`) in your project root:

```json class=config title=".markuplintrc"
{
  "extends": ["markuplint:recommended-react"],
  "parser": {
    "\\.jsx$": "@markuplint/jsx-parser"
  },
  "specs": {
    "\\.jsx$": "@markuplint/react-spec"
  }
}
```

:::info
You can also run `npx markuplint --init` to set this up interactively.
:::

See [Beyond HTML](/docs/guides/beyond-html) for the full list of supported syntaxes and configuration examples.

### Using from the command line

If you want to run Markuplint in CI or as an npm script, install it into your project:

```shell npm2yarn
npm install -D markuplint
```

Add a script to `package.json`:

```json title="package.json"
{
  "scripts": {
    "lint:html": "markuplint \"**/*.html\""
  }
}
```

```shell npm2yarn
npm run lint:html
```

:::info
The [recommended preset](/docs/guides/presets) is applied automatically when no [configuration file](/docs/configuration) is found.
:::

#### The required spec

- **Node.js** v22.0.0 or later

## Next steps

- **[Using Presets](/docs/guides/presets)** — Choose the right preset for your project and customize which rules are enabled
- **[Applying Rules](/docs/guides/applying-rules)** — Fine-tune individual rules and apply different settings to specific elements
- **[Beyond HTML](/docs/guides/beyond-html)** — Set up parsers for JSX, Vue, Svelte, Pug, PHP, and more
- **[Configuration](/docs/configuration)** — Learn about configuration file formats and all available properties
