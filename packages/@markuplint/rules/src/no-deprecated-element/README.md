---
id: no-deprecated-element
description: Warns when there is an element defined as deprecated.
---

# `no-deprecated-element`

Warns when there is an element defined as **deprecated**.

This rule refers to [HTML Living Standard](https://html.spec.whatwg.org/) based [MDN Web docs](https://developer.mozilla.org/en/docs/Web/HTML). It has settings in [`@markuplint/html-spec`](https://github.com/markuplint/markuplint/tree/main/packages/%40markuplint/html-spec/src).

An element the HTML Living Standard marks as a non-conforming, obsolete feature is [`no-obsolete-element`](/docs/rules/no-obsolete-element)'s concern.

:::note
No HTML or SVG element in the current spec data is deprecated without also being obsolete, so this rule has no effect today. It exists so a future spec-data update that adds one is caught automatically, without needing a new rule.
:::
