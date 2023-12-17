# Creating custom rule

You can create a custom rule while referring to the [**API document**](/docs/api/), but it recommends you use the below command:

```shell
npx @markuplint/create-rule
```

Please answer some questions shown.

```
? What purpose do you create the rule for? …
❯ Add the rule to this project
  Create the rule and publish it as a package
```

In the first question, you should answer either "**Add the rule to this project**" or "**Create the rule and publish it as a package**."

## Adding to your project

Please answer when it asks for a **directory name** you want. And answer a **rule name** you will create.

And choose the languages, either **TypeScript** or **JavaScript**. Then decide whether to **implement the test**.

And then there are the below files created:

<FileTree>

- 📂 `[cwd]`
  - 📂 `[dir-name]`
    - 📄 `index.ts` # or `index.js`
    - 📂 `rules`
      - 📄 `[rule-name].ts` # or `[rule-name].js`
      - 📄 `[rule-name].spec.ts` # or `[rule-name].spec.js` [Optional]

</FileTree>

:::info
The **test** code is written in [**Vitest**](https://vitest.dev/) format. Please rewrite it you need.
:::

Eventually, you should specify it to the configuration to apply it.

```json class=config
{
  "plugins": ["./[dir-name]/index.js"], // Need transpile if the source is TypeScript
  "rules": {
    "[dir-name]/[rule-name]": true
  }
}
```

:::note

**In the default**, the plugin name is the directory name you named which has been `[dir-name]` in the sample code.
You can change it if you want.

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

## Creating a plugin as a npm package

Please answer when it asks for a **plugin name** you want. And answer a **rule name** you will create.

And choose the languages, either **TypeScript** or **JavaScript**. Then decide whether to **implement the test**.

Eventually, there are the below files created:

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

## How to basic evaluate

Extract the target nodes that are from the `document` object. And evaluate it then pass it to the `report` function. The `document` object has the `walkOn` method and more, which is the **Markuplint-specific method**, and it also has native **DOM APIs** (the `querySelector` method, etc.) so that you can use both for different purposes in accordance to the use.

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

There are two methods to pass a violation to the `report` function. One is passing a **node**, as mentioned above. And the other is passing the number of a **line** and a **column**, and a **string in range**.

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

The `translate` function (There is an alias as `t`) translates a message.

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

Please see the details of [`@markuplint/i18n`](https://github.com/markuplint/markuplint/tree/main/packages/@markuplint/i18n#api) API if needed.

:::info

There is **only Japanese** besides English in the [dictionaries](https://github.com/markuplint/markuplint/tree/main/packages/%40markuplint/i18n/locales) currently. We expect [your contribution](/community/contributing) to translating the other languages.

:::
