---
id: no-empty-palpable-content
description: Warn if there is an empty palpable content element.
---

# `no-empty-palpable-content`

Warn if there is an empty palpable content element.

> Palpable content makes an element non-empty by providing either some descendant non-empty text, or else something users can hear (audio elements) or view (video, img, or canvas elements) or otherwise interact with (for example, interactive form controls).

Cite: [HTML Living Standard 3.2.5.2.8 Palpable content](<https://html.spec.whatwg.org/multipage/dom.html#palpable-content:~:text=Palpable%20content%20makes%20an%20element%20non%2Dempty%20by%20providing%20either%20some%20descendant%20non%2Dempty%20text%2C%20or%20else%20something%20users%20can%20hear%20(audio%20elements)%20or%20view%20(video%2C%20img%2C%20or%20canvas%20elements)%20or%20otherwise%20interact%20with%20(for%20example%2C%20interactive%20form%20controls).>)

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
