# FAQ

## Getting started

### I am a beginner. Is it OK to use it?

Absolutely. With VS Code, you can start immediately — just install [the extension](https://marketplace.visualstudio.com/items?itemName=markuplint.vscode-markuplint) and open an HTML file. No Node.js or command line knowledge is needed. You can also try it on the [Playground](https://playground.markuplint.dev) without installing anything.

### Can I use it with React?

Of course. Markuplint supports React (JSX), Vue, Svelte, Astro, Alpine.js, HTMX, Pug, PHP, and more via official parser plugins. See [Beyond HTML](/docs/guides/beyond-html) for details, or the [React usecase](/docs/configuration/usecases/react-project) for a copy-paste-ready configuration.

### Does it seem that Angular is not supported?

We do not have official support for Angular, but a volunteer has created [`markuplint-angular-parser`](https://www.npmjs.com/package/markuplint-angular-parser). Please use this.

### Is VS Code the only editor that is supported?

The officially supported editor is **VS Code**, but VS Code-based editors such as **Cursor**, **Windsurf**, and **VSCodium** are also expected to work since they support VS Code extensions. [The source code for the VS Code extension](https://github.com/markuplint/markuplint/tree/main/vscode) is available to the public, so we expect volunteers will develop extensions for other editors as well.

## I want to resolve a warning

### Warned at OGP

The Open Graph protocol is a different specification from HTML and is not supported by the standard. Please refer to [a possible configuration to support the protocol](/docs/rules/invalid-attr#the-open-graph-protocol).

### Warned by `invalid-attr` rule

[`invalid-attr`](/docs/rules/invalid-attr) warns when an attribute does not exist in the HTML specification. This is common when using frameworks. You can allow specific attributes using the [`allowAttrs`](/docs/rules/invalid-attr#setting-allow-attrs-option) option.

For React and Vue, spec plugins prevent warnings on framework-specific attributes. (See: [Why need the spec plugins?](/docs/guides/beyond-html#why-need-the-spec-plugins))

### Warned by `character-reference` rule

[`character-reference`](/docs/rules/character-reference) prompts you to escape characters even when they are technically valid. This may cause false positives with some template engines. You can [disable the rule](/docs/guides/ignoring-code) for affected areas, or [report the situation as an Issue](https://github.com/markuplint/markuplint/issues/new?assignees=%40YusukeHirao&labels=Bug&template=bug_repot.md&title=Fix).

### Warned by `require-accessible-name` rule

You can provide [accessible names](https://www.w3.org/TR/wai-aria-1.2/#dfn-accessible-name) using `aria-label`, but you _SHOULD NOT_ use it as your first solution. The [accessible name computation](https://www.w3.org/TR/accname-1.2/) is complex — the preferred source depends on the element:

| Element    | Preferred name source | Using `aria-label`         |
| ---------- | --------------------- | -------------------------- |
| `a`        | Content               | Permit (_NOT RECOMMENDED_) |
| `img`      | The `alt` attribute   | Permit (_NOT RECOMMENDED_) |
| `h1`–`h6`  | Content               | Permit (_NOT RECOMMENDED_) |
| `button`   | Content               | Permit (_NOT RECOMMENDED_) |
| `input`    | The `label` element   | Permit (_NOT RECOMMENDED_) |
| `select`   | The `label` element   | Permit (_NOT RECOMMENDED_) |
| `textarea` | The `label` element   | Permit (_NOT RECOMMENDED_) |

### I don't know how to fix the code that gave me the warning

The immediate action is to **add elements and attributes that are required, and remove those that are unnecessary**. If this requires style changes, modify the style — there are no specification rules about how elements should be styled, but there are rules about which elements and attributes are valid.

**Knowledge of HTML is essential** for making informed fix decisions. We recommend learning by studying the elements and attributes that triggered warnings. The [HTML Standard](https://html.spec.whatwg.org/multipage/) is the authoritative source, but [MDN's HTML guide](https://developer.mozilla.org/en-US/docs/Learn/HTML) is a good starting point.

### It's not incorrect, but I get a warning

This is likely a bug, but please check the following first:

- Are you using a [syntax with known limitations](/docs/guides/beyond-html#supported-syntaxes)? ([#240](https://github.com/markuplint/markuplint/issues/240))

If the issue is related to unsupported syntax, please disable the rule partially for now. If not, please report it to us.

## I want to know more

### Does Markuplint work as an accessibility checker?

Markuplint checks accessibility issues that can be found **statically in the code**:

- Whether HTML, SVG, and WAI-ARIA comply with specifications
- Missing accessible names, incorrect ARIA roles, improper landmark structure
- Project-specific rules you configure

Accessibility also involves information architecture, visual design, and content strategy — areas beyond what static code analysis can cover. But Markuplint takes on the code-related aspects, freeing you to focus on the rest.

### What makes it different from HTMLHint and eslint-plugin-jsx-a11y?

Key differences:

- **Structure validation** — Markuplint checks parent-child relationships of elements (content models)
- **Powerful selectors** — Fine-grained rule control using CSS Selectors, extended pseudo-classes, and regex
- **Broad syntax support** — 17+ syntaxes beyond HTML and JSX

[**HTMLHint**](https://htmlhint.com/) and [**eslint-plugin-jsx-a11y**](https://github.com/jsx-eslint/eslint-plugin-jsx-a11y) each have unique capabilities too. They can all be used together.

### Is JSON output supported?

Yes. Use the `--format` option in the CLI:

```shell
markuplint "**/*.html" --format JSON
```

### Can it be used for E2E testing?

Yes. While Markuplint is primarily designed for component-level checking, it can also lint rendered HTML. Since Markuplint uses its own **HTML parser** (not a browser's), HTML must be passed as a string. For E2E testing, you can pass either the server-returned HTML string or the browser's DOM tree (serialized to a string) to the [Markuplint API](/docs/api).

### The glob format does not work as expected in the CLI

Some shells expand glob patterns before passing them to the CLI. Always enclose globs in quotation marks:

```shell
# ❌ Shell may expand this before Markuplint sees it
markuplint **/*.html

# ✅ Passed as a string to Markuplint for internal glob processing
markuplint "**/*.html"
```

## I found a bug

Thank you for using Markuplint. First, you can **immediately [disable the rule](/docs/guides/ignoring-code#disable-by-selector)** that's causing the issue. If the problem only affects certain elements, disable the rule partially using selectors so the rest of your code stays protected.

Then please [create an issue](https://github.com/markuplint/markuplint/issues/new?assignees=%40YusukeHirao&labels=Bug&template=bug_repot.md&title=Fix) to let us know. You can also reach out on [X (Twitter)](https://x.com/markuplint) — we actively monitor mentions of "Markuplint".
