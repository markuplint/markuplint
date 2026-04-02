# Understanding Selectors

When you want to [apply rules to specific elements](applying-rules#applying-rules-to-specific-elements), you use **selectors** in the `nodeRules` or `childNodeRules` properties. Markuplint's selector syntax supports **CSS Selectors**, extended pseudo-classes, and regular expressions — giving you flexible control over which elements a rule targets.

## CSS Selectors

Markuplint supports parts of [**W3C Selectors Level 4**](https://www.w3.org/TR/selectors-4/).

<details>
<summary>Supported selector syntaxes and operators</summary>

| Selector Type                                    | Code Example                                                                              | Support |
| ------------------------------------------------ | ----------------------------------------------------------------------------------------- | ------- |
| Universal selector                               | `*`                                                                                       | ✅      |
| Type selector                                    | `div`                                                                                     | ✅      |
| ID selector                                      | `#id`                                                                                     | ✅      |
| Class selector                                   | `.class`                                                                                  | ✅      |
| Attribute selector                               | `[data-attr]`                                                                             | ✅      |
| Attribute selector, Exact match                  | `[data-attr=value]`                                                                       | ✅      |
| Attribute selector, Include whitespace separated | `[data-attr~=value]`                                                                      | ✅      |
| Attribute selector, Subcode match                | <code>[data-attr\|=value]</code>                                                          | ✅      |
| Attribute selector, Partial match                | `[data-attr*=value]`                                                                      | ✅      |
| Attribute selector, Forward match                | `[data-attr^=value]`                                                                      | ✅      |
| Attribute selector, Backward match               | `[data-attr$=value]`                                                                      | ✅      |
| Negation pseudo-class                            | `:not(div)`                                                                               | ✅      |
| Matches-Any pseudo-class                         | `:is(div)`                                                                                | ✅      |
| Specificity-adjustment pseudo-class              | `:where(div)`                                                                             | ✅      |
| Relational pseudo-class                          | `:has(div)` `:has(> div)`                                                                 | ✅      |
| Directionality pseudo-class                      | `:dir(ltr)`                                                                               | ❌      |
| Language pseudo-class                            | `:lang(en)`                                                                               | ❌      |
| Hyperlink pseudo-class                           | `:any-link`                                                                               | ❌      |
| Link History pseudo-class                        | `:link` `:visited`                                                                        | ❌      |
| Local link pseudo-class                          | `:local-link`                                                                             | ❌      |
| Target pseudo-class                              | `:target`                                                                                 | ❌      |
| Target container pseudo-class                    | `:target-within`                                                                          | ❌      |
| Reference element pseudo-class                   | `:scope`                                                                                  | ✅      |
| Current-element pseudo-class                     | `:current` `:current(div)`                                                                | ❌      |
| Past pseudo-class                                | `:past`                                                                                   | ❌      |
| Future pseudo-class                              | `:future`                                                                                 | ❌      |
| Interactive pseudo-class                         | `:active` `:hover` `:focus` `:focus-within` `:focus-visible`                              | ❌      |
| Enable and disable pseudo-class                  | `:enable` `:disable`                                                                      | ❌      |
| Mutability pseudo-class                          | `:read-write` `:read-only`                                                                | ❌      |
| Placeholder-shown pseudo-class                   | `:placeholder-shown`                                                                      | ❌      |
| Default-option pseudo-class                      | `:default`                                                                                | ❌      |
| Selected-option pseudo-class                     | `:checked`                                                                                | ❌      |
| Indeterminate value pseudo-class                 | `:indeterminate`                                                                          | ❌      |
| Validity pseudo-class                            | `:valid` `:invalid`                                                                       | ❌      |
| Range pseudo-class                               | `:in-range` `:out-of-range`                                                               | ❌      |
| Optionality pseudo-class                         | `:required` `:optional`                                                                   | ❌      |
| Empty-Value pseudo-class                         | `:blank`                                                                                  | ❌      |
| User-interaction pseudo-class                    | `:user-invalid`                                                                           | ❌      |
| Root pseudo-class                                | `:root`                                                                                   | ✅      |
| Empty pseudo-class                               | `:empty`                                                                                  | ❌      |
| Nth-child pseudo-class                           | `:nth-child(2)` `:nth-last-child(2)` `:first-child` `:last-child` `:only-child`           | ❌      |
| Nth-child pseudo-class (`of El` Syntax)          | `:nth-child(2 of div)` `:nth-last-child(2 of div)`                                        | ❌      |
| Nth-of-type pseudo-class                         | `:nth-of-type(2)` `:nth-last-of-type(2)` `:first-of-type` `:last-of-type` `:only-of-type` | ❌      |
| Nth-col pseudo-class                             | `:nth-col(2)` `:nth-last-col(2)`                                                          | ❌      |
| Pseudo elements                                  | `::before` `::after`                                                                      | ❌      |
| Descendant combinator                            | `div span`                                                                                | ✅      |
| Child combinator                                 | `div > span`                                                                              | ✅      |
| Next-sibling combinator                          | `div + span`                                                                              | ✅      |
| Subsequent-sibling combinator                    | `div ~ span`                                                                              | ✅      |
| Column combinator                                | <code>div \|\| span</code>                                                                | ❌      |
| Multiple selectors                               | `div, span`                                                                               | ✅      |

</details>

:::tip

Markuplint supports the **`:has` selector**. Combined with combinator operators, it allows very flexible element selection.

```json class=config title=":has selector with Subsequent-sibling combinator"
{
  "nodeRules": [
    {
      // Apply to all elements that are <picture>'s child and previous siblings of <img>
      "selector": "picture img:has(~)",
      "rules": {
        "required-attr": true
      }
    }
  ]
}
```

:::

## Specificity

Markuplint applies **specificity** the same way as **CSS Selectors**, allowing you to control the priority of rule application.

```json class=config title="Control priority"
{
  "nodeRules": [
    {
      // Apply
      "selector": "#id.class-name", // Specificity: 1-1-0
      "rules": {
        "required-attr": true
      }
    },
    {
      // Don't apply (Ignore)
      "selector": ".class-name", // Specificity: 0-1-0
      "rules": {
        "required-attr": false
      }
    }
  ]
}
```

:::info
When selectors have the same specificity, rules are applied **in order** of their settings.
:::

:::tip
Markuplint supports the **`:where` selector**, which always has zero specificity.

```json class=config title="Control priority"
{
  "nodeRules": [
    {
      // Don't apply
      "selector": ":where(#id.class-name)", // Specificity: 0-0-0
      "rules": {
        "required-attr": true
      }
    },
    {
      // Apply (Overwrite)
      "selector": ".class-name", // Specificity: 0-1-0
      "rules": {
        "required-attr": false
      }
    }
  ]
}
```

:::

## Extended selectors

Markuplint provides extended pseudo-class-like selectors for HTML-specific matching.

- [~~`:closest`~~](./selectors#ex-selector-closest) (**Deprecated** — use `:is()` instead)
- [`:aria`](./selectors#ex-selector-aria)
- [`:role`](./selectors#ex-selector-role)
- [`:model`](./selectors#ex-selector-model)

| Syntax                | Description                                                                                                                                 |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `:closest(selectors)` | **Deprecated.** Use `:is(selectors *)` instead. See [migration guide](#ex-selector-closest).                                                |
| `:aria(has name)`     | [ARIA pseudo-class](https://github.com/markuplint/markuplint/tree/main/packages/%40markuplint/selector#aria-pseudo-class)                   |
| `:role(heading)`      | [ARIA Role pseudo-class](https://github.com/markuplint/markuplint/tree/main/packages/%40markuplint/selector#aria-pseudo-class)              |
| `:model(interactive)` | [Content Model pseudo-class](https://github.com/markuplint/markuplint/tree/main/packages/%40markuplint/selector#content-model-pseudo-class) |

:::info

These selectors are **experimental features** and do not guarantee compatibility. They may be removed in the next major version if they conflict with CSS Selectors.

:::

### `:closest` {#ex-selector-closest}

:::caution Deprecated
`:closest()` is deprecated and will be removed in the next major version. Use the standard `:is()` pseudo-class with the descendant combinator instead.
:::

**Concept**: [`Element.closest`](https://dom.spec.whatwg.org/#ref-for-dom-element-closest%E2%91%A0) method

```
:closest(selectors)
```

Matches elements that have an ancestor matching the given selectors.

**Migration:** Replace `:closest(X)` with `:is(X *)`:

| Before                              | After                         |
| ----------------------------------- | ----------------------------- |
| `:closest(nav)`                     | `:is(nav *)`                  |
| `:closest(.wrapper)`                | `:is(.wrapper *)`             |
| `div:closest(nav):closest(section)` | `div:is(nav *):is(section *)` |

### `:aria` {#ex-selector-aria}

**ARIA pseudo-class**

```
:aria(syntax)
```

| Syntax        | Code                 | Description                                |
| ------------- | -------------------- | ------------------------------------------ |
| `has name`    | `:aria(has name)`    | Apply elements have accessible name        |
| `has no name` | `:aria(has no name)` | Apply elements have **no** accessible name |

### `:role` {#ex-selector-role}

**ARIA Role pseudo-class**

```
:role(roleName)
:role(roleName|version)
```

For example, `:role(button)` matches `<button>` and `<div role="button">`.

You can specify **version of WAI-ARIA** by separating the pipe like `:role(form|1.1)`.

### `:model` {#ex-selector-model}

**Content Model pseudo-class**

```
:model(contentModel)
```

For example, `:model(interactive)` matches `<a>`(with `href` attr), `<button>`, and more.

## Regular expression selector

Use **regular expressions** to select elements by matching the **node name**, **attribute name**, **attribute value**, or a combination of these.

```json class=config
{
  "childNodeRules": [
    {
      "regexSelector": {
        "nodeName": "/^[a-z]+$/",
        "attrName": "/^[a-z]+$/",
        "attrValue": "/^[a-z]+$/"
      },
      "rules": {
        "required-attr": "true"
      }
    }
  ]
}
```

For more complex matching patterns, see the [`regexSelector` property reference](/docs/configuration/properties#regexselector).

:::caution
`regexSelector` and `selector` cannot be used together. If both are specified, `selector` takes priority.
:::

## Next steps

- **[Applying Rules](/docs/guides/applying-rules)** — Use selectors in `nodeRules` and `childNodeRules`
- **[Usecases](/docs/configuration/usecases)** — Real-world examples using selectors and regex selectors
- **[Configuration Properties](/docs/configuration/properties)** — Full reference for `nodeRules`, `childNodeRules`, and `regexSelector`
