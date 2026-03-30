# Creating Custom Rules

You can create a custom rule by referring to the [**API documentation**](/docs/api/), but the easiest way is to use the scaffolding command:

```shell
npx @markuplint/create-rule
```

Answer the interactive questions:

```
? What purpose do you create the rule for? …
❯ Add the rule to this project
  Create the rule and publish it as a package
```

Choose either "**Add the rule to this project**" or "**Create the rule and publish it as a package**."

## Adding to your project

The command will ask for a **directory name** and a **rule name**. Then choose between **TypeScript** or **JavaScript**, and whether to include **tests**.

The following files are created:

<FileTree>

- 📂 `[cwd]`
  - 📂 `[dir-name]`
    - 📄 `index.ts` # or `index.js`
    - 📂 `rules`
      - 📄 `[rule-name].ts` # or `[rule-name].js`
      - 📄 `[rule-name].spec.ts` # or `[rule-name].spec.js` [Optional]

</FileTree>

:::info
The **test** code is written in [**Vitest**](https://vitest.dev/) format. Rewrite it as needed for your test runner.
:::

Then specify it in your configuration to apply it:

```json class=config
{
  "plugins": ["./[dir-name]/index.js"], // Need transpile if the source is TypeScript
  "rules": {
    "[dir-name]/[rule-name]": true
  }
}
```

:::note

By default, the plugin name is the directory name (`[dir-name]` in the examples above). You can change it in the plugin definition:

```ts title="./[dir-name]/index.ts"
import { createPlugin } from '@markuplint/ml-core';

import { ruleName } from './rules/ruleName';

export default createPlugin({
  name: '[dir-name]', // 👈 Change here if you want
  create(setting) {
    return {
      rules: {
        ruleName: ruleName(setting),
      },
    };
  },
});
```

:::

## Creating a plugin as an npm package

The command will ask for a **plugin name** and a **rule name**. Then choose between **TypeScript** or **JavaScript**, and whether to include **tests**.

The following files are created:

<FileTree>

- 📂 `[cwd]`
  - 📄 `README.md`
  - 📄 `package.json`
  - 📄 `tsconfig.json` # Only when chose TypeScript
  - 📂 `src`
    - 📄 `index.ts` # or `index.js`
    - 📂 `rules`
      - 📄 `[rule-name].ts` # or `[rule-name].js`
      - 📄 `[rule-name].spec.ts` # or `[rule-name].spec.js` [Optional]

</FileTree>

## Basic evaluation

Extract target nodes from the `document` object, evaluate them, and pass violations to the `report` function. The `document` object provides both **Markuplint-specific methods** (like `walkOn`) and native **DOM APIs** (like `querySelector`):

```ts
createRule({
  async verify({ document, report }) {
    // Walking style
    await document.walkOn('Element', el => {
      if (el.localName === 'div') {
        report({
          scope: el,
          message: 'The div element is found',
        });
      }
    });

    // DOM API traversing style
    const el = document.querySelector('div');
    if (el) {
      report({
        scope: el,
        message: 'The div element is found',
      });
    }
  },
});
```

There are two ways to report a violation: pass a **node**, or pass the **line**, **column**, and **raw string**:

```ts
report({
  scope: node, // Specify a node (Element, Attribute, or TextNode, etc.)
  message: 'Warning message',
});

report({
  line: 20,
  col: 10,
  raw: 'string in range',
  message: 'Warning message',
});
```

## Messages <abbr title="internationalization">i18n</abbr>

The `translate` function (aliased as `t`) translates messages:

```ts
createRule({
  async verify({ document, report, translate, t }) {
    const noTitle = !document.querySelector('title');
    if (noTitle) {
      report({
        line: 1,
        col: 1,
        raw: '',
        message: translate('missing {0}', t('the "{0*}" {1}', 'title', 'element')),
      });
    }
  },
});
```

```shell title="Result in English:"
Missing the "title" element
```

```shell title="Result in Japanese:"
「title」要素がありません
```

See the [`@markuplint/i18n` API](https://github.com/markuplint/markuplint/tree/main/packages/@markuplint/i18n#api) for details.

:::info
Currently only **Japanese** is available besides English in the [dictionaries](https://github.com/markuplint/markuplint/tree/main/packages/%40markuplint/i18n/locales). [Contributions](/community/contributing) for other languages are welcome.
:::

## Next steps

- **[API Documentation](/docs/api/)** — Full API reference for rule development
- **[Applying Rules](/docs/guides/applying-rules)** — How to apply custom rules in your configuration
