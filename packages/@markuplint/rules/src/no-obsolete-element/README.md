---
id: no-obsolete-element
description: Warns when there is an element the HTML Living Standard marks as a non-conforming, obsolete feature.
---

# `no-obsolete-element`

Warns when there is an element the [HTML Living Standard](https://html.spec.whatwg.org/multipage/obsolete.html#non-conforming-features) marks as a non-conforming, obsolete feature — authors must not use it.

An element merely marked deprecated (not yet removed from the spec) is [`no-deprecated-element`](/docs/rules/no-deprecated-element)'s concern.

❌ Examples of **incorrect** code for this rule

```html
<font></font>
<big></big>
<marquee></marquee>
```

✅ Examples of **correct** code for this rule

```html
<span style="font-size: larger"></span>
```
