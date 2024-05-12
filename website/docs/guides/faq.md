# FAQ

## I found a bug. What should I do?

I appreciate your use. First, you must be having trouble with the current markup, and you will want to resolve that.

**What you can do immediately is [disable the rule](/docs/guides/ignoring-code#disable-by-selector)**. If it is a partial problem, I would recommend disabling it partially while using selectors. That way, other areas where the bug is not occurring will remain enabled, and Markuplint itself can continue to be used.

We don't care if you report the bug after that. It's best to you to [create an issue](https://github.com/markuplint/markuplint/issues/new?assignees=%40YusukeHirao&labels=Bug&template=bug_repot.md&title=Fix). Otherwise, it's ok you send a DM to [the author's Twitter account](https://twitter.com/cloud10designs) or send a tweet with "Markuplint" in it, and we will pick it up. Please help us fix bugs and improve features.

## It's not incorrect, but I get a warning

The possibility of a bug is very high, but we want something you should check before doing so.

- Using newline codes is CRLF [#31](https://github.com/markuplint/markuplint/issues/31)
- Using a [syntax that is not yet supported](/docs/guides/besides-html#supported-syntaxes) [#240](https://github.com/markuplint/markuplint/issues/240)

These are known problems, but we are having difficulty dealing with them now. We are sorry, but we ask that you partially disable the rules.

If you find any problems other than those listed above, please report them to us.

## I am a beginner. Is it OK to use it?

No problem. We encourage beginners to use it. If you want to make good use of Markuplint, you need to know Node.js and commands, but with VS Code, you can use it immediately just by installing [the extension](https://marketplace.visualstudio.com/items?itemName=yusukehirao.vscode-markuplint). Also, if you want to try it out, [Playground site](https://playground.markuplint.dev) is available.

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

[`invalid-attr`](/docs/rules/invalid-attr) rule warns when an attribute is specified for an element that does not exist in the HTML specification, which may be encountered frequently when using non-HTML syntax or frameworks. You can eliminate the warning by adding the attributes you want to allow. `invalid-attr` has [`attrs`](/docs/rules/invalid-attr#setting-attrs-option) option to add the attribute you want to allow.

For React and Vue, spec plugins have been introduced to prevent warnings on specific attributes in each syntax. (FYI: [Why need the spec plugins?](/docs/guides/besides-html#why-need-the-spec-plugins))

If you want a spec plugin that helps syntax or framework ([Next.js](https://nextjs.org/), [Nuxt](https://nuxtjs.org/), etc.), please request it from us.

## Warned by `character-reference` rule

[`character-reference`](/docs/rules/character-reference) does not strictly evaluate characters. Even if a character is in a valid place and does not need to be escaped, you will be prompted to change it. This may cause inconvenience for some syntax and template engines. In that case, you may be able to disable the rule itself, or please [report the situation as an Issue](https://github.com/markuplint/markuplint/issues/new?assignees=%40YusukeHirao&labels=Bug&template=bug_repot.md&title=Fix).

## Warned by `require-accessible-name` rule

You can solve [accessible names](https://www.w3.org/TR/wai-aria-1.2/#dfn-accessible-name) using `aria-label`, but you _SHOULD NOT_ use it as your first solution. The [accessible name computation](https://www.w3.org/TR/accname-1.1/) is complex, and there are different places to get them for other elements, so please refer to the following table.

| Element    | Name form             | Using `aria-label`          |
| ---------- | --------------------- | --------------------------- |
| `a`        | Content               | Permit（_NOT RECOMMENDED_） |
| `img`      | The `alt` attribute   | Permit（_NOT RECOMMENDED_） |
| `h1`〜`h6` | Content               | Permit（_NOT RECOMMENDED_） |
| `button`   | Content               | Permit（_NOT RECOMMENDED_） |
| `table`    | The `caption` element | Permit（_NOT RECOMMENDED_） |
| `input`    | The `label` element   | Permit（_NOT RECOMMENDED_） |
| `select`   | The `label` element   | Permit（_NOT RECOMMENDED_） |
| `textarea` | The `label` element   | Permit（_NOT RECOMMENDED_） |

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

Of course, it can be used with React (JSX) and Vue, Svelte, Astro, Alpine.js, HTMX, Pug, PHP, etc. To use these, you need to use the official plug-ins provided by Markuplint. For more information, please refer to [Using to besides HTML](/docs/guides/besides-html).

## Does it seem that Angular is not supported?

We do not have official support for Angular, but a volunteer has created [`markuplint-angular-parser`](https://www.npmjs.com/package/markuplint-angular-parser). Please use this.

## Is VS Code the only editor that is supported?

Sorry, **only VS Code** is officially supported. Atom used to be supported, but now only VS Code is supported. [The source code for the VS Code extension](https://github.com/markuplint/vscode-markuplint) is available to the public, so we expect volunteers will develop it.

## Is JSON output supported?

JSON output is possible by using the `--format` option in the CLI.

```shell
markuplint "**/*.html" --format JSON
```

## Can it be used for E2E testing?

Yes, of course. Markuplint is designed for each component checking but can also be used to check the rendered HTML. Markuplint uses a different **HTML parser** than the browser, so HTML must be passed as a string. For E2E testing, you can check either the HTML string returned by the server or the DOM tree exposed by the browser by converting it to a string and passing it to [Markuplint API](/docs/api).
