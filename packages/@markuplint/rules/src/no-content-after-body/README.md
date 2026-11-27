---
id: no-content-after-body
description: Disallow a start tag or non-whitespace text after the end tag that closes the body element.
---

# `no-content-after-body`

Per [HTML Living Standard §13.2.6.4.17 (the "after body" insertion mode)](https://html.spec.whatwg.org/multipage/parsing.html#parsing-main-afterbody), once the parser has seen `</body>`, a start tag or any non-whitespace character is a parse error — the "Anything else" case switches the insertion mode back to "in body" and reprocesses the token, so the content still ends up nested inside `<body>` even though, in the source, it appears after `</body>`.

A trailing whitespace-only newline after `</body>` has its own, non-error case in the same insertion mode and is not reported.

The body is closed by its first `</body>`, or by `</html>` when no `</body>` comes before it; a later `</body>` closes nothing. A `</html>` that closes the body takes the parser through "after body" to [the "after after body" insertion mode](https://html.spec.whatwg.org/multipage/parsing.html#the-after-after-body-insertion-mode), whose "Anything else" case is the same parse error, so content after that `</html>` is reported too, and the message names the `html` element.

❌ Examples of **incorrect** code for this rule

```html
<body></body>
<p>stray paragraph</p>
```

✅ Examples of **correct** code for this rule

```html
<body>
  <p>paragraph</p>
</body>
```
