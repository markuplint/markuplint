---
id: permitted-contents
description: Validate the content model and structural constraints of HTML elements.
---

# `permitted-contents`

Validate the content model and structural constraints of HTML elements according to the [HTML Living Standard](https://html.spec.whatwg.org/). It has settings in [`@markuplint/html-spec`](https://github.com/markuplint/markuplint/tree/main/packages/%40markuplint/html-spec/src).

This rule warns when:

- A child element or text node is not allowed by the parent's content model
- An element appears as a descendant of a forbidden ancestor (e.g., `<header>` inside `<header>`)
- A required ancestor is missing (e.g., `<area>` outside `<map>`)
- A sibling-unique attribute appears on multiple elements of the same type (e.g., multiple `<track default>`)
- An element that requires non-empty text content is empty or contains only whitespace (e.g., `<title>`, `<option>` without `label`)

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

<!-- Forbidden ancestor: header must not appear inside header or footer -->
<header>
	<div>
		<header>Not allowed nested header</header>
	</div>
</header>

<!-- button disallows interactive content descendants; a[href] is interactive
     content even though <a> itself has a transparent content model -->
<button>
	<a href="/path"><span>Not allowed interactive content</span></a>
</button>
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

<header>
	<nav>Navigation</nav>
</header>

<button>
	<a>Non-interactive because it has no href attribute</a>
</button>
```
<!-- prettier-ignore-end -->

---

## Details

### Setting value

Specify the target element for which you want to set a rule as an array. In the following example, rules are specified for each of the custom elements `x-container` and `x-item`.

```json class=config
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

```json class=config
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

```json class=config
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

### Tag rules with the [`pretenders`](/docs/guides/beyond-html#pretenders) option

When an element is mapped to an HTML element via [`pretenders`](/docs/guides/beyond-html#pretenders) (e.g., a JSX component `<Breadcrumbs>` pretending to be `<nav>`), this rule evaluates the element in **two independent passes**:

1. **Pretended pass** — validates the element against the HTML content model of the pretender target (e.g., `<nav>`). This is how all other rules see the element and matches the historical behavior.
2. **Origin pass** — if you have declared a tag rule keyed on the component's original name (the identifier that appears in the source code), that rule is additionally evaluated with the pretender context suppressed, so child selectors match the component identities (e.g., `BreadcrumbList` matches `<BreadcrumbList>`, not the pretended `<ol>`).

The origin pass only runs when **both** conditions hold:

- The element has a pretender mapping (from the `pretenders` config or an `as` attribute), **and**
- The `permitted-contents` config contains an entry whose `tag` equals the component's source-level name

If the user has not declared a tag rule for the component name, the origin pass is skipped and the rule behaves exactly as it did before — existing configurations are not affected.

```json class=config
{
  "pretenders": [
    { "selector": "Breadcrumbs", "as": "nav" },
    { "selector": "BreadcrumbsLabel", "as": "span" },
    { "selector": "BreadcrumbList", "as": "ol" },
    { "selector": "BreadcrumbItem", "as": "li" },
    { "selector": "BreadcrumbLink", "as": "a" }
  ],
  "rules": {
    "permitted-contents": [
      {
        "tag": "Breadcrumbs",
        "contents": [{ "optional": "BreadcrumbsLabel" }, { "require": "BreadcrumbList" }]
      },
      { "tag": "BreadcrumbList", "contents": [{ "oneOrMore": "BreadcrumbItem" }] },
      { "tag": "BreadcrumbItem", "contents": [{ "require": "BreadcrumbLink" }] },
      { "tag": "BreadcrumbLink", "contents": [{ "require": "#text" }] }
    ]
  }
}
```

With this config, the rule enforces the component-level structure (origin pass) **and** the pretended HTML content model (`<nav>`/`<ol>`/…) simultaneously. Because the two passes report violations independently, a single child node may receive multiple diagnostics when it breaks both views — this is intentional so that the author can see each perspective.

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

### Detection limit for conditional transparent elements

When many transparent elements (e.g. `<a>`, `<ins>`, `<del>`) with conditional branches such as `v-if`/`v-else` or `{#if}` are siblings, the rule evaluates the cross-product of their branches. To keep this from growing exponentially, the cross-product is capped (currently `2^10 = 1024` patterns). Beyond the cap — roughly **11 or more conditional transparent siblings** — the rule falls back to a conservative over-approximation that merges all branches together. This never produces false positives, but it may **under-report** real violations (false negatives) in that one structure.

This limit is intentional and rarely reached in real markup. To check whether a document hit it, run with the debug logger enabled:

```shell
DEBUG=ml-rules:content-model npx markuplint target.html
```

A `Transparent pattern cap exceeded` line is logged for each element that triggered the fallback.
