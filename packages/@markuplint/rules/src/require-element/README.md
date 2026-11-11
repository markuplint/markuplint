---
id: require-element
description: Required elements
---

# `require-element`

Warns if specified elements didn't appear on a document or an element. Use the selector to specify.

This is a generic rule for searching the required element. It searches the tree of the document or of the element: what is in the content of a `template` element or in a declarative shadow root does not satisfy it, as that is a tree of its own.

:::info

Use the [`require-h1`](../require-h1/) rule if you expect to require the h1 element. Use the [`no-nested-top-level-landmark`](../no-nested-top-level-landmark/) rule if you expect to check landmark element structure. Use the [`permitted-contents`](../permitted-contents) rule if you expect to check conformance according to HTML Standard.

:::

❌ Examples of **incorrect** code for this rule

```html
<!-- "require-element": ["meta[charset=\"UTF-8\"]"] -->
<head>
  <title>Page title</title>
</head>
```

✅ Examples of **correct** code for this rule

```html
<!-- "require-element": ["meta[charset=\"UTF-8\"]"] -->
<head>
  <meta charset="UTF-8" />
  <title>Page title</title>
</head>
```

---

## Configuration Example

If specified to `rules`, It searches the element from a document.

```json class=config
{
  "rules": {
    "require-element": ["meta[charset=\"UTF-8\"]"]
  }
}
```

If specified to `nodeRules` or `childNodeRules`, It searches the element from child elements of the target element.

```json class=config
{
  "nodeRules": [
    {
      "selector": "head",
      "rules": {
        "require-element": ["meta[charset=\"UTF-8\"]"]
      }
    }
  ]
}
```

### Setting `ignoreHasMutableContents` option {#setting-ignore-has-mutable-contents}

- Type: `boolean`
- Default: `true`

Skips the check when what the required element may be rendered by is not known. For an element it is a child that stands for children that are not known: a block of a preprocessor language such as _Pug_'s `include`, a `<slot>`, or a component that no [pretender](/docs/guides/beyond-html#pretenders) resolved, such as `<Meta />` in JSX. For a rule on the whole document it is any of those, or an expression, anywhere. A component that a pretender resolved is the element it stands for, so it is checked as that element. What a descendant of a child renders is not a child of the element, so it does not skip the check.

```html
<!-- "require-element": ["meta[charset=\"UTF-8\"]"] -->
<head>
  <meta />
</head>
```

Set `ignoreHasMutableContents` to `false` to check them as they are written.

### Setting `ignoreOmittedElements` option {#setting-ignore-omitted-elements}

HTML allows certain tags to be omitted (e.g., `<tbody>`). The HTML parser implicitly creates these omitted elements as ghost nodes. By default, these ghost elements are **ignored** — only elements explicitly written in the source satisfy the requirement. Set `ignoreOmittedElements` to `false` if you want ghost elements to count as satisfying the requirement.

```json class=config
{
  "nodeRules": [
    {
      "selector": "table",
      "rules": {
        "require-element": {
          "value": ["tbody"],
          "options": {
            "ignoreOmittedElements": false
          }
        }
      }
    }
  ]
}
```
