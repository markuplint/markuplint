---
id: no-deprecated-attr
description: Warns when there is an attribute defined as deprecated.
---

# `no-deprecated-attr`

Warns when there is an attribute defined as **deprecated**.

This rule reads the `deprecated` flag of the spec data in [`@markuplint/html-spec`](https://github.com/markuplint/markuplint/tree/main/packages/%40markuplint/html-spec/src): what a specification marks as deprecated (the [features the HTML Living Standard keeps conforming with a warning](https://html.spec.whatwg.org/multipage/obsolete.html#obsolete-but-conforming-features), SVG, MathML) and what browser vendors deprecate according to [@mdn/browser-compat-data](https://github.com/mdn/browser-compat-data). Some of the HTML Living Standard's features are deprecated only for some elements: `maxlength` and `size` of an `<input>` whose `type` is `number`, and `type` of a `<script>` that is empty or a JavaScript MIME type essence match. The spec data says so with a selector (`deprecatedWhen`), which the element has to match.

An attribute the HTML Living Standard marks as a non-conforming, obsolete feature is [`no-obsolete-attr`](/docs/rules/no-obsolete-attr)'s concern.

❌ Examples of **incorrect** code for this rule

```html
<a name="top">Top</a>
```

✅ Examples of **correct** code for this rule

```html
<a id="top">Top</a>
```
