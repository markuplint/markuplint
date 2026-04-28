# Beyond HTML

Markuplint can lint syntaxes **beyond HTML** — including JSX, Vue, Svelte, Pug, PHP, and more — by using parser and spec plugins.

## Installing plugins

Install the **parser plugin** through your package manager:

```shell npm2yarn
npm install -D @markuplint/pug-parser
```

If your code uses tagged template literals containing HTML (e.g., [lit-html](https://lit.dev/)), install the **tagged template literal parser**:

```shell npm2yarn
npm install -D @markuplint/tagged-template-literal-parser
```

If a syntax has its own specification you should install the **spec plugin** with the parser plugin:

```shell npm2yarn
npm install -D @markuplint/jsx-parser @markuplint/react-spec
```

```shell npm2yarn
npm install -D @markuplint/vue-parser @markuplint/vue-spec
```

### Supported syntaxes

| Template or syntax                                                                         | Parser                                       | Spec                      |
| ------------------------------------------------------------------------------------------ | -------------------------------------------- | ------------------------- |
| [**JSX**](https://react.dev/learn/writing-markup-with-jsx)                                 | `@markuplint/jsx-parser`                     | `@markuplint/react-spec`  |
| [**Vue**](https://vuejs.org/)                                                              | `@markuplint/vue-parser`                     | `@markuplint/vue-spec`    |
| [**Svelte**](https://svelte.dev/)                                                          | `@markuplint/svelte-parser`                  | `@markuplint/svelte-spec` |
| [**SvelteKit**](https://kit.svelte.dev/)                                                   | `@markuplint/svelte-parser/kit`              | -                         |
| [**Astro**](https://astro.build/)                                                          | `@markuplint/astro-parser`                   | -                         |
| [**Alpine.js**](https://alpinejs.dev)                                                      | `@markuplint/alpine-parser`                  | `@markuplint/alpine-spec` |
| [**HTMX**](https://htmx.org)                                                               | -                                            | `@markuplint/htmx-spec`   |
| [**Tagged template literals**](https://lit.dev/) (lit-html etc.)                           | `@markuplint/tagged-template-literal-parser` | -                         |
| [**Markdown**](https://commonmark.org/)                                                    | `@markuplint/markdown-parser`                | -                         |
| [**MDX**](https://mdxjs.com/)                                                              | `@markuplint/mdx-parser`                     | `@markuplint/react-spec`  |
| [**Pug**](https://pugjs.org/)                                                              | `@markuplint/pug-parser`                     | -                         |
| [**PHP**](https://www.php.net/)                                                            | `@markuplint/php-parser`                     | -                         |
| [**Smarty**](https://www.smarty.net/)                                                      | `@markuplint/smarty-parser`                  | -                         |
| [**eRuby**](https://docs.ruby-lang.org/en/master/ERB.html)                                 | `@markuplint/erb-parser`                     | -                         |
| [**EJS**](https://ejs.co/)                                                                 | `@markuplint/ejs-parser`                     | -                         |
| [**Mustache**](https://mustache.github.io/) or [**Handlebars**](https://handlebarsjs.com/) | `@markuplint/mustache-parser`                | -                         |
| [**Nunjucks**](https://mozilla.github.io/nunjucks/)                                        | `@markuplint/nunjucks-parser`                | -                         |
| [**Liquid**](https://liquidjs.com/)                                                        | `@markuplint/liquid-parser`                  | -                         |

:::note
There is `@markuplint/html-parser` package but the core package includes it.
You don't need to install and to specify it to the configuration.
:::

:::caution Unsupported syntaxes

It's not able to support syntaxes if one's attribute is complex.

- [PHP](https://www.php.net/)
- [Smarty](https://www.smarty.net/)
- [eRuby](https://docs.ruby-lang.org/en/master/ERB.html)
- [EJS](https://ejs.co/)
- [Mustache](https://mustache.github.io/)/[Handlebars](https://handlebarsjs.com/)
- [Nunjucks](https://mozilla.github.io/nunjucks/)
- [Liquid](https://liquidjs.com/)

### ✅ Available code

```html
<div attr="{{ value }}"></div>
```

<!-- prettier-ignore-start -->
```html
<div attr='{{ value }}'></div>
```
<!-- prettier-ignore-end -->

```html
<div attr="{{ value }}-{{ value2 }}-{{ value3 }}"></div>
```

### ❌ Unavailable code

If it doesn't nest by quotations.

<!-- prettier-ignore-start -->
```html
<div attr={{ value }}></div>
```
<!-- prettier-ignore-end -->

**PULL REQUEST WANTED**: This problem is recognized by developers and created as an issue [#240](https://github.com/markuplint/markuplint/issues/240).

:::

## Applying plugins

Specify the plugin in the `parser` property of your [configuration file](/docs/configuration). If the syntax has a spec plugin, add it to the `specs` property as well. Use a regular expression as the key to match target file names.

```json class=config title="Use React"
{
  "parser": {
    "\\.jsx$": "@markuplint/jsx-parser"
  },
  "specs": {
    "\\.jsx$": "@markuplint/react-spec"
  }
}
```

```json class=config title="Use Vue"
{
  "parser": {
    "\\.vue$": "@markuplint/vue-parser"
  },
  "specs": {
    "\\.vue$": "@markuplint/vue-spec"
  }
}
```

```json class=config title="Use lit-html"
{
  "parser": {
    "\\.ts$": "@markuplint/tagged-template-literal-parser"
  }
}
```

```json class=config title="Use Markdown"
{
  "parser": {
    "\\.md$": "@markuplint/markdown-parser"
  }
}
```

```json class=config title="Use MDX"
{
  "parser": {
    "\\.mdx$": "@markuplint/mdx-parser"
  },
  "specs": {
    "\\.mdx$": "@markuplint/react-spec"
  }
}
```

See the [`parser`](/docs/configuration/properties#parser) and [`specs`](/docs/configuration/properties#specs) property references for details.

### Why need the spec plugins? {#why-need-the-spec-plugins}

For example, the `key` attribute doesn't exist in native HTML elements, but it's commonly used in **React** and **Vue**. Spec plugins like `@markuplint/react-spec` and `@markuplint/vue-spec` tell Markuplint about these framework-specific attributes.

```js
const Component = ({ list }) => {
  return (
    <ul>
      {list.map(item => (
        <li key={item.key}>{item.text}</li>
      ))}
    </ul>
  );
};
```

```html
<template>
  <ul>
    <li v-for="item in list" :key="item.key">{{ item.text }}</li>
  </ul>
</template>
```

In addition, **spec plugins** include definitions for framework-specific attributes and directives.

## Pretenders

In **React**, **Vue**, and more, custom components cannot be evaluated as HTML elements. This means Markuplint's content model rules — such as [`permitted-contents`](/docs/rules/permitted-contents) — have no way of knowing what a component actually renders. Without this information, a `<Button>` component that renders a `<button>` element is treated as an unknown element, and invalid nesting like `<a><Button /></a>` (interactive content inside interactive content) goes undetected.

:::note Scope
Pretenders apply to **custom components only** — web components, JSX/Vue/Svelte authored components, and HTML-parsed names that have no spec entry. Targeting a standard HTML element (`<marquee>`, `<button>`, etc.) is a no-op so that deprecation, ARIA, and browser-support rules keyed on the original tag are not silently masked.
:::

<!-- prettier-ignore-start -->
```jsx
<List>{/* No evaluate as native HTML Element */}
  <Item />{/* No evaluate as native HTML Element */}
  <Item />{/* No evaluate as native HTML Element */}
  <Item />{/* No evaluate as native HTML Element */}
</List>
```
<!-- prettier-ignore-end -->

The **Pretenders** feature resolves that by telling Markuplint what each component renders as.

### Manual configuration

You can manually specify a [selector](./selectors) for each component and the HTML element it renders:

```json class=config
{
  "pretenders": [
    {
      "selector": "List",
      "as": "ul"
    },
    {
      "selector": "Item",
      "as": "li"
    }
  ]
}
```

<!-- prettier-ignore-start -->
```jsx
<List>{/* Evaluate as <ul> */}
  <Item />{/* Evaluate as <li> */}
  <Item />{/* Evaluate as <li> */}
  <Item />{/* Evaluate as <li> */}
</List>
```
<!-- prettier-ignore-end -->

This works well for small projects, but manually maintaining the list becomes tedious as your component library grows. That's where **dynamic scanning** comes in.

See the details of [`pretenders`](/docs/configuration/properties#pretenders) property on the configuration if you want.

To enforce structural relationships between components (e.g., a `<Breadcrumbs>` must contain a `<BreadcrumbList>`), combine pretenders with the [`permitted-contents`](/docs/rules/permitted-contents) rule. Its tag-rule entries are evaluated against the component's source-level name in addition to the pretended HTML content model, so component-level structure can be validated alongside the underlying HTML.

### Dynamic scanning {#pretenders-scan}

:::caution[Experimental]
This feature is **experimental** and may change in future releases.
:::

Instead of manually listing every component, you can let Markuplint **scan your component source files** and discover pretender mappings automatically.

```json class=config
{
  "pretenders": {
    "scan": [
      {
        "files": "./src/components/**/*.tsx"
      }
    ]
  }
}
```

This single configuration replaces what might otherwise be dozens of manual pretender entries. When Markuplint runs, it analyzes your component files and determines:

- **Which HTML element** each component renders as its root element
- **Whether the component accepts children** (slots detection)
- **Static attributes** on the root element

#### Supported file types

File extensions determine the scanner automatically:

| Extensions                   | Scanner          | Frameworks                 |
| ---------------------------- | ---------------- | -------------------------- |
| `.js`, `.jsx`, `.ts`, `.tsx` | JSX scanner      | React, Preact, Solid, etc. |
| `.vue`                       | Template scanner | Vue                        |
| `.svelte`                    | Template scanner | Svelte                     |
| `.astro`                     | Template scanner | Astro                      |

You can scan multiple file types at once:

```json class=config
{
  "pretenders": {
    "scan": [
      {
        "files": "./src/components/**/*.tsx"
      },
      {
        "files": "./src/components/**/*.vue",
        "ignoreComponentNames": ["BaseLayout"]
      }
    ]
  }
}
```

#### What the scanner detects

Consider the following React component:

```tsx
const ProfileCard = ({ children }) => {
  return <article className="profile">{children}</article>;
};
```

The scanner automatically discovers that `ProfileCard` renders as `<article>` and accepts children. This is equivalent to writing:

```json
{
  "selector": "ProfileCard",
  "as": {
    "element": "article",
    "slots": true
  }
}
```

Now Markuplint can correctly validate that `<ProfileCard>` contains only [flow content](https://html.spec.whatwg.org/multipage/dom.html#flow-content-2) (as `<article>` does), and that nesting `<ProfileCard>` inside a `<p>` would be invalid.

#### Combining scan with manual definitions

You can use `scan` alongside manual `data` definitions. This is useful when the scanner cannot determine the correct mapping for a particular component, or when you want to override the scanned result:

```json class=config
{
  "pretenders": {
    "scan": [
      {
        "files": "./src/components/**/*.tsx"
      }
    ],
    "data": [
      {
        "selector": "SpecialComponent",
        "as": {
          "element": "nav",
          "aria": { "name": { "fromAttr": "label" } }
        }
      }
    ]
  }
}
```

See [`pretenders.scan`](/docs/configuration/properties#pretenders/scan) for the full configuration reference.

### The `as` attribute

If a component has the `as` attribute, it is evaluated as the element specified by this attribute.

<!-- prettier-ignore-start -->
```html
<x-ul as="ul"><!-- Evaluate as <ul> -->
  <x-li as="li"></x-li><!-- Evaluate as <li> -->
  <x-li as="li"></x-li><!-- Evaluate as <li> -->
  <x-li as="li"></x-li><!-- Evaluate as <li> -->
</x-ul>
```
<!-- prettier-ignore-end -->

This evaluation also applies to its attributes that are inherited from the component.

<!-- prettier-ignore-start -->
```html
<!-- Evaluate as <img src="image.png" alt="image"> -->
<x-img src="image.png" alt="image">
```
<!-- prettier-ignore-end -->

## Next steps

- **[Using Presets](/docs/guides/presets)** — Choose a framework-specific preset (e.g., `markuplint:recommended-react`)
- **[Applying Rules](/docs/guides/applying-rules)** — Customize rules for your project
- **[Configuration Properties](/docs/configuration/properties)** — Full reference for `parser`, `specs`, and `pretenders`
