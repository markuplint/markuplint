---
description: Warns when a document doesn't include a DOCTYPE.
id: require-doctype
---

# `require-doctype`

Warns when a document doesn't include a DOCTYPE. Ignored for document fragments.

An included DOCTYPE that uses an obsolete public/system identifier form is [`no-obsolete-doctype`](/docs/rules/no-obsolete-doctype)'s concern, not this rule's — any DOCTYPE, obsolete or not, satisfies this rule.

❌ Examples of **incorrect** code for this rule

<!-- prettier-ignore-start -->
```html
<html>
  <head>
    <title>Any Page</title>
  </head>
  <body>
    <h1>Any Page</h1>
    <p>Anonymous</p>
  </body>
</html>
```
<!-- prettier-ignore-end -->

✅ Examples of **correct** code for this rule

<!-- prettier-ignore-start -->
```html
<!doctype html>
<html>
  <head>
    <title>Any Page</title>
  </head>
  <body>
    <h1>Any Page</h1>
    <p>Anonymous</p>
  </body>
</html>
```
<!-- prettier-ignore-end -->
