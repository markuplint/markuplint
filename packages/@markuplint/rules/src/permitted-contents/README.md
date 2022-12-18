---
description: Permitted contents
id: permitted-contents
category: validation
severity: error
---

# `permitted-contents`

Warn if a child element has a not allowed element or text node.

This rule refer [HTML Living Standard](https://html.spec.whatwg.org/) based [MDN Web docs](https://developer.mozilla.org/en/docs/Web/HTML). It has settings in [`@markuplint/html-spec`](https://github.com/markuplint/markuplint/blob/main/packages/%40markuplint/html-spec/index.json).

It is possible to make the structure robust by setting element relationships on template engines such as custom elements and Vue.

❌ Examples of **incorrect** code for this rule

<!-- prettier-ignore-start -->
```html
<ul>
	<div>Not allowed DIV element</div>
</ul>
<ul>Not allowed text node</ul>

<table>
	<thead><tr><th>Header cell<th></tr></thead>
	<tfoot><tr><td>Wrong ordered TFOOT element<td></tr></tfoot>
	<tbody><tr><td>Body cell<td></tr></tbody>
</table>
```
<!-- prettier-ignore-end -->

✅ Examples of **correct** code for this rule

<!-- prettier-ignore-start -->
```html
<ul>
	<li>List item</li>
	<li>List item</li>
</ul>

<table>
	<thead><tr><th>Header cell<th></tr></thead>
	<tbody><tr><td>Body cell<td></tr></tbody>
	<tfoot><tr><td>Footer cell<td></tr></tfoot>
</table>
```
<!-- prettier-ignore-end -->

---

## Details

### Setting value

Specify the target element for which you want to set a rule as an array. In the following example, rules are specified for each of the custom elements `x-container` and `x-item`.

```json
{
  "rules": {
    "permitted-contents": [
      {
        "tag": "x-container",
        "contents": []
      },
      {
        "tag": "x-item",
        "contents": []
      }
    ]
  }
}
```

#### `tag`

- Type: `string`
- Required

Specify the target element (tag) name. Case is not significant.

#### `contents`

Specify the target elements as an array. The order of this array means **allowed content order**. (Content not included in this array will be **not allowed content**)

It is defined using one of the five keywords `require`, `optional`, `oneOrMore`, `zeroOrMore`, and `choice`.

Of these, `require`, `optional`, `oneOrMore` and `zeroOrMore` mean the number of elements. Specify the tag name (or `# text` for text nodes) using the keyword as a key. Each keyword cannot be simultaneously specified.

```json
{
  "rules": {
    "permitted-contents": [
      {
        "tag": "x-container",
        "contents": [
          { "require": "x-item" },
          { "optional": "y-item" },
          { "oneOrMore": "z-item" },
          { "zeroOrMore": "#text" },
          // ❌ Cannot specify keywords simultaneously
          {
            "require": "x-item",
            "optional": "y-item"
          }
        ]
      }
    ]
  }
}
```

| Keyword      | Number of node |
| ------------ | -------------- |
| `require`    | Always one     |
| `optional`   | Zero or one    |
| `oneOrMore`  | One or more    |
| `zeroOrMore` | Zero or more   |

An arbitrary upper-limit can be specified with the `max` key. You can also set a lower-limit `min` key when you specify `require`.

Depending on the combination, the following two specifications have the same meaning:

```json
{ "optional": "tag", "max": 5 }
{ "zeroOrMore": "tag", "max": 5 }
```

---

The `choice` keyword has the following meanings for the specified array:

| Keyword  | Meanings |
| -------- | -------- |
| `choice` | Any one  |

```json
{
  "rules": {
    "permitted-contents": [
      {
        "tag": "x-container",
        "contents": [
          {
            "choice": [{ "oneOrMore": "x-item" }, { "oneOrMore": "y-item" }]
          }
        ]
      }
    ]
  }
}
```

### Setting `ignoreHasMutableChildren` option

- Type: `boolean`
- Default: `true`

Ignore if it has mutable child elements in a preprocessor language like _Pug_ or a component library like _Vue_. (If use _Pug_ or _Vue_ need each [@markuplint/pug-parser](https://github.com/markuplint/markuplint/tree/main/packages/%40markuplint/pug-parser) and [@markuplint/vue-parser](https://github.com/markuplint/markuplint/tree/main/packages/%40markuplint/vue-parser))

```pug
html
	// Originally, it is warned because the head element does not include the title element, but it is ignored because it contains a mutable element such as include.
	head
		include path/to/meta-list.pug
	body
		p lorem...
```
