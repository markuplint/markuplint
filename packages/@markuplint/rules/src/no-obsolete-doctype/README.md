---
description: Warns when a document declares an obsolete DOCTYPE.
id: no-obsolete-doctype
---

# `no-obsolete-doctype`

Warns when a document declares an obsolete DOCTYPE — one with a public identifier, or a system identifier other than the one legacy-string exception the HTML Living Standard still permits.

A missing DOCTYPE entirely is [`require-doctype`](/docs/rules/require-doctype)'s concern, not this rule's.

❌ Examples of **incorrect** code for this rule

```html
<!DOCTYPE html PUBLIC "-//W3C//DTD HTML 4.01//EN" "http://www.w3.org/TR/html4/strict.dtd">
```

✅ Examples of **correct** code for this rule

```html
<!doctype html>
```

:::note
[HTML Living Standard §13.1.1](https://html.spec.whatwg.org/multipage/syntax.html#the-doctype) permits exactly one legacy-string form as a conforming exception, used to keep a document shareable with old parsers that require a system identifier:

```html
<!DOCTYPE html SYSTEM "about:legacy-compat">
```

This rule does not flag it.
:::
