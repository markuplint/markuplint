# FAQ

## I found a bug. What should I do?

Thank you for using Markuplint. First, you can **immediately [disable the rule](/docs/guides/ignoring-code#disable-by-selector)** that's causing the issue. If the problem only affects certain elements, disable the rule partially using selectors so the rest of your code stays protected.

Then please [create an issue](https://github.com/markuplint/markuplint/issues/new?assignees=%40YusukeHirao&labels=Bug&template=bug_repot.md&title=Fix) to let us know. You can also reach out on [X (Twitter)](https://x.com/cloud10designs) — we actively monitor mentions of "Markuplint".

## It's not incorrect, but I get a warning

This is likely a bug, but please check the following first:

- Are you using a [syntax with known limitations](/docs/guides/beyond-html#supported-syntaxes)? ([#240](https://github.com/markuplint/markuplint/issues/240))

If the issue is related to unsupported syntax, please disable the rule partially for now. If not, please report it to us.

## I am a beginner. Is it OK to use it?

Absolutely. With VS Code, you can start immediately — just install [the extension](https://marketplace.visualstudio.com/items?itemName=yusukehirao.vscode-markuplint) and open an HTML file. No Node.js or command line knowledge is needed. You can also try it on the [Playground](https://playground.markuplint.dev) without installing anything.

## Does Markuplint work as an accessibility checker?

Some, but not all, of the checks Markuplint supports are primarily:

- Whether HTML, SVG, and WAI-ARIA are compliant with the specification
- Accessibility issues that can be found statically in the code
- Whether or not the project follows the rules of the project you have arranged

Accessibility is related only to the code but also to information architecture and visual design. And its problems can arise from the content and strategy stage in the first place. However, we hope that Markuplint will at least take on the code-related aspects of the project, thereby creating room to work on solving the other issues.

## What makes it different from HTMLHint and eslint-plugin-jsx-a11y?

Some of the things it can do are common, but the significant differences from Markuplint are

- The ability to check the conformity of the parent-child relationship (structure) of elements
- Powerful selector functionality for fine-grained control of rules.
- Support for many syntaxes other than HTML and JSX.

Of course, [**HTMLHint**](https://htmlhint.com/) and [**eslint-plugin-jsx-a11y**](https://github.com/jsx-eslint/eslint-plugin-jsx-a11y) can only do what each of them can do, and all of them can be introduced and used together, so we hope you will use them as appropriate for your project.

## I don't know how to fix the code that gave me the warning

This is a complicated question. It is difficult to give a general answer because it depends on the nature of the problem on a case-by-case basis. The immediate solution is **to add elements and attributes you are said necessary and remove elements and attributes you are said they are unnecessary**. If this requires modification of the style, then modify the style. There are basically no rules for which elements should be styled. However, there are rules for HTML elements and attributes. The question is which one takes precedence. There are many advantages to conformance, such as accessibility and compatibility. While there may be costs associated with modification and maintenance management issues in your project, if the quality of the product is a priority, you should be proactive about it.

Also, we may say that is nonsense, but **Knowledge of HTML is essential** when you consider a modification proposal. We think it a good idea to learn HTML by gradually studying the elements and attributes for which you received warnings from Markuplint. The best way is to look up the specification of the [HTML Standard](https://html.spec.whatwg.org/multipage/) itself, but you may want to start with something easy to read, such as MDN's document [Structuring the web with HTML](https://developer.mozilla.org/en-US/docs/Learn/HTML).

## Warned at OGP

The Open Graph protocol is a different specification from HTML and is not supported by the standard. Please refer to [a possible configuration to support the protocol](/docs/rules/invalid-attr#the-open-graph-protocol).

## Warned by `invalid-attr` rule

[`invalid-attr`](/docs/rules/invalid-attr) rule warns when an attribute is specified for an element that does not exist in the HTML specification, which may be encountered frequently when using non-HTML syntax or frameworks. You can eliminate the warning by adding the attributes you want to allow. `invalid-attr` has [`allowAttrs`](/docs/rules/invalid-attr#setting-allow-attrs-option) option to add the attribute you want to allow.

For React and Vue, spec plugins have been introduced to prevent warnings on specific attributes in each syntax. (FYI: [Why need the spec plugins?](/docs/guides/beyond-html#why-need-the-spec-plugins))

If you want a spec plugin that helps syntax or framework ([Next.js](https://nextjs.org/), [Nuxt](https://nuxtjs.org/), etc.), please request it from us.

## Warned by `character-reference` rule

[`character-reference`](/docs/rules/character-reference) does not strictly evaluate characters. Even if a character is in a valid place and does not need to be escaped, you will be prompted to change it. This may cause inconvenience for some syntax and template engines. In that case, you may be able to disable the rule itself, or please [report the situation as an Issue](https://github.com/markuplint/markuplint/issues/new?assignees=%40YusukeHirao&labels=Bug&template=bug_repot.md&title=Fix).

## Warned by `require-accessible-name` rule

You can solve [accessible names](https://www.w3.org/TR/wai-aria-1.2/#dfn-accessible-name) using `aria-label`, but you _SHOULD NOT_ use it as your first solution. The [accessible name computation](https://www.w3.org/TR/accname-1.2/) is complex, and there are different places to get them for other elements, so please refer to the following table.

| Element    | Name form           | Using `aria-label`          |
| ---------- | ------------------- | --------------------------- |
| `a`        | Content             | Permit（_NOT RECOMMENDED_） |
| `img`      | The `alt` attribute | Permit（_NOT RECOMMENDED_） |
| `h1`〜`h6` | Content             | Permit（_NOT RECOMMENDED_） |
| `button`   | Content             | Permit（_NOT RECOMMENDED_） |
| `input`    | The `label` element | Permit（_NOT RECOMMENDED_） |
| `select`   | The `label` element | Permit（_NOT RECOMMENDED_） |
| `textarea` | The `label` element | Permit（_NOT RECOMMENDED_） |

## The glob format does not work as expected in the CLI

Some shells behave differently with glob formats; if you want to pass a glob format to Markuplint's CLI, you should undoubtedly enclose it in quotation marks.

```shell
# Depending on the shell, full paths of files are passed
# as strings of variable-length arguments to the Markuplint CLI
markuplint **/*.html

# Since it is passed as a string to the Markuplint CLI,
# it will be processed internally as a glob
markuplint "**/*.html"
```

## Can I use it with React?

Of course. Markuplint supports React (JSX), Vue, Svelte, Astro, Alpine.js, HTMX, Pug, PHP, and more via official parser plugins. See [Beyond HTML](/docs/guides/beyond-html) for details.

## Does it seem that Angular is not supported?

We do not have official support for Angular, but a volunteer has created [`markuplint-angular-parser`](https://www.npmjs.com/package/markuplint-angular-parser). Please use this.

## Is VS Code the only editor that is supported?

The officially supported editor is **VS Code**, but VS Code-based editors such as **Cursor** are also expected to work since they support VS Code extensions. [The source code for the VS Code extension](https://github.com/markuplint/markuplint/tree/main/vscode) is available to the public, so we expect volunteers will develop extensions for other editors as well.

## Is JSON output supported?

JSON output is possible by using the `--format` option in the CLI.

```shell
markuplint "**/*.html" --format JSON
```

## Can it be used for E2E testing?

Yes. While Markuplint is primarily designed for component-level checking, it can also lint rendered HTML. Since Markuplint uses its own **HTML parser** (not a browser's), HTML must be passed as a string. For E2E testing, you can pass either the server-returned HTML string or the browser's DOM tree (serialized to a string) to the [Markuplint API](/docs/api).
