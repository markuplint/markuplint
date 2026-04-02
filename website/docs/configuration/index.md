# Configuration

## What should I configure?

If you're using the [VS Code extension](/docs/guides#the-quickest-way-vs-code-extension) with plain HTML, **you don't need a configuration file** — the [recommended preset](/docs/guides/presets) is applied by default.

You need a configuration file when you want to:

- **Use a framework** (React, Vue, Svelte, etc.) — set up [`parser`](/docs/configuration/properties#parser) and [`specs`](/docs/configuration/properties#specs)
- **Choose a different preset** — set [`extends`](/docs/configuration/properties#extends)
- **Customize rules** — override rules in the [`rules`](/docs/configuration/properties#rules) property
- **Apply rules to specific elements** — use [`nodeRules`](/docs/configuration/properties#noderules) or [`childNodeRules`](/docs/configuration/properties#childnoderules)

A minimal configuration file looks like this:

```json class=config title=".markuplintrc"
{
  "extends": ["markuplint:recommended"]
}
```

For a framework project (e.g., React):

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

See [Usecases](/docs/configuration/usecases) for more real-world examples, or the [Properties reference](/docs/configuration/properties) for all available options.

## Configuration file

Markuplint **automatically searches** for a configuration file by recursively looking upward from the directory of the target file. It applies the configuration file closest to each target.

<FileTree>

- 📂 `A`
  - 📄 `.markuplintrc` # (1)
  - 📂 `B`
    - 📄 `index.html` # &lt;- Apply (1) `A/.markuplintrc`
    - 📂 `C`
      - 📄 `index.html` # &lt;- Apply (1) `A/.markuplintrc`
      - 📂 `D`
        - 📄 `.markuplintrc` # (2)
        - 📄 `index.html` # &lt;- Apply (2) `A/B/C/D/.markuplintrc`

</FileTree>

:::note
Markuplint **stops searching** when it finds the closest configuration file. This differs from [**ESLint**](https://eslint.org/docs/latest/user-guide/configuring/configuration-files#cascading-and-hierarchy)'s default behavior — it works as if `{ "root": true }` were set.

Use the `extends` field if you want to inherit from configuration files in parent directories.
:::

### Format and filename

The following filenames are recognized, listed by priority:

- `markuplint` field in `package.json`
- `.markuplintrc.json`
- `.markuplintrc.jsonc`
- `.markuplintrc.yaml`
- `.markuplintrc.yml`
- `.markuplintrc.js`
- `.markuplintrc.cjs`
- `.markuplintrc.mjs`
- `.markuplintrc.ts`
- `markuplint.config.js`
- `markuplint.config.cjs`
- `markuplint.config.mjs`
- `markuplint.config.ts`
- `markuplint.config.jsonc`

`.markuplintrc` (without extension) supports JSON (with comments) and YAML formats.

#### JSON

```json class=config
{
  "extends": ["markuplint:recommended"]
}
```

#### YAML

```yaml class=config
extends:
  - markuplint:recommended
```

#### JavaScript

```js class=config
module.exports = {
  extends: ['markuplint:recommended'],
};
```

#### TypeScript

```ts class=config
import type { Config } from '@markuplint/ml-config';

const config: Config = {
  extends: ['markuplint:recommended'],
};

export default config;
```

## Next steps

- **[Properties](/docs/configuration/properties)** — Full reference for all configuration properties
- **[Usecases](/docs/configuration/usecases)** — Real-world configuration examples
- **[Using Presets](/docs/guides/presets)** — Choose the right preset for your project
