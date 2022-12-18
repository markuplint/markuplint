---
description: Disallow empty palpable content
id: no-empty-palpable-content
category: validation
severity: warning
---

# `no-empty-palpable-content`

Warn if there is an empty palpable content element.

HTML Standard says:

> Palpable content makes an element non-empty by providing either some descendant non-empty text, or else something users can hear (audio elements) or view (video, img, or canvas elements) or otherwise interact with (for example, interactive form controls).

Cite: https://html.spec.whatwg.org/multipage/dom.html#palpable-content

❌ Examples of **incorrect** code

<!-- prettier-ignore-start -->
```html
<div></div>
<div> </div>
<div>

</div>
```
<!-- prettier-ignore-end -->

✅ Examples of **correct** code

```html
<div>text contet</div>
<div><img src="path/to" alt="image content" /></div>
```
