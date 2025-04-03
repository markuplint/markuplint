# Guides

## Getting started

### Instant using

```shell
npx markuplint target.html
```

:::info

It applies [recommended preset](/docs/guides/presets) if it doesn't find a [configuration file](/docs/configuration).

:::

### The required spec

- **Node.js** v18.18.0 or later

### Using in your project

Create a [configuration file](/docs/configuration) and install dependencies.

```shell
npx markuplint --init
npm add -D markuplint
```

Answer questions interactively, then install `markuplint`.

Add a command to the `scripts` option on `package.json`:

```json title="package.json"
{
  "scripts": {
    "lint:html": "markuplint \"**/*.html\""
  }
}
```

If you want to change the target path, you can change it for your project.

Execute the script:

```shell npm2yarn
npm run lint:html
```

## Using with Visual Studio Code

You can install it from [Visual Studio Marketplace](https://marketplace.visualstudio.com/items?itemName=yusukehirao.vscode-markuplint). Or search &ldquo;markuplint&rdquo; on the VS Code extension.
