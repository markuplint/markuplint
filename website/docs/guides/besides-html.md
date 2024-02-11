# Using to besides HTML

You can also apply it to syntaxes **besides HTML** such as template engines or frameworks if using plugins together.

## Installing plugins

Install the **parser plugin** through npm or Yarn:

```shell npm2yarn
npm install -D @markuplint/pug-parser
```

If a syntax has its own specification you should install the **spec plugin** with the parser plugin:

```shell npm2yarn
npm install -D @markuplint/jsx-parser @markuplint/react-spec
```

```shell npm2yarn
npm install -D @markuplint/vue-parser @markuplint/vue-spec
```

### Supported syntaxes

| Template or syntax                                                                         | Parser                          | Spec                             |
| ------------------------------------------------------------------------------------------ | ------------------------------- | -------------------------------- |
| [**JSX**](https://react.dev/learn/writing-markup-with-jsx)                                 | `@markuplint/jsx-parser`        | `@markuplint/react-spec`         |
| [**Vue**](https://vuejs.org/)                                                              | `@markuplint/vue-parser`        | `@markuplint/vue-spec`           |
| [**Svelte**](https://svelte.dev/)                                                          | `@markuplint/svelte-parser`     | `@markuplint/svelte-spec`        |
| [**SvelteKit**](https://kit.svelte.dev/)                                                   | `@markuplint/svelte-parser/kit` | -                                |
| [**Astro**](https://astro.build/)                                                          | `@markuplint/astro-parser`      | -                                |
| [**Alpine.js**](https://alpinejs.dev)                                                      | `@markuplint/alpine-parser`     | `@markuplint/alpine-parser/spec` |
| [**Pug**](https://pugjs.org/)                                                              | `@markuplint/pug-parser`        | -                                |
| [**PHP**](https://www.php.net/)                                                            | `@markuplint/php-parser`        | -                                |
| [**Smarty**](https://www.smarty.net/)                                                      | `@markuplint/smarty-parser`     | -                                |
| [**eRuby**](https://docs.ruby-lang.org/en/master/ERB.html)                                 | `@markuplint/erb-parser`        | -                                |
| [**EJS**](https://ejs.co/)                                                                 | `@markuplint/ejs-parser`        | -                                |
| [**Mustache**](https://mustache.github.io/) or [**Handlebars**](https://handlebarsjs.com/) | `@markuplint/mustache-parser`   | -                                |
| [**Nunjucks**](https://mozilla.github.io/nunjucks/)                                        | `@markuplint/nunjucks-parser`   | -                                |
| [**Liquid**](https://liquidjs.com/)                                                        | `@markuplint/liquid-parser`     | -                                |

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

Specify a plugin to apply to the `parser` property on the [configuration file](/docs/configuration).
And If it has spec add to the `specs` property.
Set a regular expression that can identify the target file name to the `parser` property key.

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

See explained configuring [`parser`](/docs/configuration/properties#parser) and [`specs`](/docs/configuration/properties#specs) if you want details.

### Why need the spec plugins? {#why-need-the-spec-plugins}

For example, the `key` attribute doesn't exist in native HTML elements. But you often need to specify it when you use **React** or **Vue**. So you should specify `@markuplint/react-spec` or `@markuplint/vue-spec`.

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

Besides, **spec plugins** include specific attributes and directives each owned.

## Pretenders

In **React**, **Vue**, and more, It cannot evaluate custom components as HTML elements.

<!-- prettier-ignore-start -->
```jsx
<List>{/* No evaluate as native HTML Element */}
  <Item />{/* No evaluate as native HTML Element */}
  <Item />{/* No evaluate as native HTML Element */}
  <Item />{/* No evaluate as native HTML Element */}
</List>
```
<!-- prettier-ignore-end -->

The **Pretenders** feature resolves that.

It evaluates components as rendered HTML elements on each rule if you specify a [selector](./selectors) for a component and properties of an element that it exposes.

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

See the details of [`pretenders`](/docs/configuration/properties#pretenders) property on the configuration if you want.

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
