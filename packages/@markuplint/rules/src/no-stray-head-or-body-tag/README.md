---
id: no-stray-head-or-body-tag
description: Disallow a stray head end tag or a duplicate body start tag left behind by an implicit head closure.
---

# `no-stray-head-or-body-tag`

Content the [HTML Living Standard](https://html.spec.whatwg.org/multipage/parsing.html#parsing-main-inhead) doesn't permit in `<head>` (e.g. `<math>`) implicitly closes `head` and reprocesses the offending token in `<body>`. That closure is not itself a parse error, but if the source still contains a literal `</head>` tag afterward, or a second `<body>` start tag, those tokens now arrive too late:

- Per [§13.2.6.4.7 (the "in body" insertion mode, "Any other end tag")](https://html.spec.whatwg.org/multipage/parsing.html#parsing-main-inbody), an end tag that no longer matches the current open element is a parse error.
- Per the same section's "A start tag whose tag name is 'body'", a second `<body>` start tag is a parse error.

❌ Examples of **incorrect** code for this rule

```html
<head>
  <title>math in head</title>
  <math><mi>x</mi></math>
</head>
<body></body>
```

✅ Examples of **correct** code for this rule

```html
<head>
  <title>ordinary head content</title>
</head>
<body>
  <math><mi>x</mi></math>
</body>
```
