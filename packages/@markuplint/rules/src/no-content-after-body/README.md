---
id: no-content-after-body
description: Disallow a start tag or non-whitespace text after the end tag that closes the body element.
---

# `no-content-after-body`

Per [HTML Living Standard §13.2.6.4.17 (the "after body" insertion mode)](https://html.spec.whatwg.org/multipage/parsing.html#parsing-main-afterbody), once the parser has seen `</body>`, a start tag or any non-whitespace character is a parse error — the "Anything else" case switches the insertion mode back to "in body" and reprocesses the token, so the content still ends up nested inside `<body>` even though, in the source, it appears after `</body>`.

A trailing whitespace-only newline after `</body>` has its own, non-error case in the same insertion mode and is not reported.

The body is closed by its first `</body>`, or by `</html>` when no `</body>` comes before it, and the content after that end tag is reported. A later `</body>` that comes right after it is a surplus end tag; one that comes after the content closes the body again, but the content before it is already after the end of the body. A `</html>` that closes the body takes the parser through "after body" to [the "after after body" insertion mode](https://html.spec.whatwg.org/multipage/parsing.html#the-after-after-body-insertion-mode), whose "Anything else" case is the same parse error, so content after that `</html>` is reported too, and the message names the `html` element.

The content is reported wherever the parser puts it. When an element inside the body is still open at the end tag that closes the body (`<body><div></body><p>x</p>`), the reprocessed content goes into that element, as [the appropriate place for inserting a node](https://html.spec.whatwg.org/multipage/parsing.html#appropriate-place-for-inserting-a-node) is the current node, and it is reported there.

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
