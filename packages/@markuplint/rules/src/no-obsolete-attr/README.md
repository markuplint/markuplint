---
id: no-obsolete-attr
description: Warns when there is an attribute the HTML Living Standard marks as a non-conforming, obsolete feature.
---

# `no-obsolete-attr`

Warns when there is an attribute the [HTML Living Standard](https://html.spec.whatwg.org/multipage/obsolete.html#non-conforming-features) marks as a non-conforming, obsolete feature — authors must not use it.

An attribute merely marked deprecated (not yet removed from the spec) is [`no-deprecated-attr`](/docs/rules/no-deprecated-attr)'s concern.

❌ Examples of **incorrect** code for this rule

```html
<link rel="alternate" href="/feed" charset="utf-8" />
```

✅ Examples of **correct** code for this rule

```html
<link rel="alternate" href="/feed" />
```
