# Guides

## Getting started

### Instant using

```shell
npx markuplint target.html
```

:::info
It applies [recommended preset](/guides/presets) if it doesn't find a [configuration file](/configuration).
:::

### The required spec

- Node.js v14.6.0 or later

### Using in your project

Create a [configuration](/configuration) file and install dependencies.

```shell
npx markuplint --init
```

Answer questions interactively.
By doing this, needed modules are installed includes `markuplint`.

Add a command to the `scripts` option on `package.json`:

```json title="package.json"
{
  "scripts": {
    "html:lint": "markuplint **/*.html"
  }
}
```

If you want to change the target path, you can change it for your project.

Execute the script:

```shell npm2yarn
npm run html:lint
```

## Using with Visual Studio Code

You can install it from [Visual Studio Marketplace](https://marketplace.visualstudio.com/items?itemName=yusukehirao.vscode-markuplint). Or search &ldquo;markuplint&rdquo; on the VS Code extension.
