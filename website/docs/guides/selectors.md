# Understanding Selectors

It should set **selector** to [apply to some](applying-rules#applying-to-some). The selector syntax supports the same as **CSS Selectors**, Markuplint specific extended syntaxes, and more. So you can select elements quite flexibly.

## CSS Selectors

It supports parts of [**W3C Selectors Level 4**](https://www.w3.org/TR/selectors-4/).

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

It supports **`:has` selector**. You can select elements flexibly if you do it with combinator operators.

```json title=":has selector with Subsequent-sibling combinator"
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

It applies **specificity** same as **CSS Selectors**. By doing this, you can control priority to apply rules.

```json title="Control priority"
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
Apply according to settings **in order** when selectors are the same specificity.
:::

:::tip
It supports **`:where` selector**. The selector always has zero specificity.

```json title="Control priority"
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

You can use selectors like pseudo-class that Markuplint extended.

- [`:closest`](./selectors#ex-selector-closest)
- [`:aria`](./selectors#ex-selector-aria)
- [`:role`](./selectors#ex-selector-role)
- [`:model`](./selectors#ex-selector-model)

| Syntax                | Description                                                                                                                                 |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `:closest(selectors)` | Concept: [`Element.closest`](https://dom.spec.whatwg.org/#ref-for-dom-element-closest%E2%91%A0) method                                      |
| `:aria(has name)`     | [ARIA pseudo-class](https://github.com/markuplint/markuplint/tree/main/packages/%40markuplint/selector#aria-pseudo-class)                   |
| `:role(heading)`      | [ARIA Role pseudo-class](https://github.com/markuplint/markuplint/tree/main/packages/%40markuplint/selector#aria-pseudo-class)              |
| `:model(interactive)` | [Content Model pseudo-class](https://github.com/markuplint/markuplint/tree/main/packages/%40markuplint/selector#content-model-pseudo-class) |

:::info

This selectors are **experemental features**. It goes without saying these are not compatibility. It will drop these in the next major version immediately if they conflict with CSS Selectors.

:::

### `:closest` {#ex-selector-closest}

**Concept**: [`Element.closest`](https://dom.spec.whatwg.org/#ref-for-dom-element-closest%E2%91%A0) method

```
:closest(selectors)
```

It applies to elements that have ancestors that match the selectors.

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

Use **regular expressions** to select elements.
Specify it to match the **node name**, **attribute name**, or **attribute value**, or combine each.

```json
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

You can select elements more complexly. See explained configuring [`regexSelector`](/configuration/properties#regexselector) if you want details.

:::caution
Cannot specify `regexSelector` together with `selector`. It prioritizes `selector` over `regexSelector`.
:::
