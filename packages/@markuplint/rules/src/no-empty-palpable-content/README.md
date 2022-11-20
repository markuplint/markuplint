---
title: 'Disallow empty palpable content'
id: 'no-empty-palpable-content'
category: 'validation'
---

# Disallow empty palpable content

Warn if there is an empty palpable content element.

HTML Standard says:

> Palpable content makes an element non-empty by providing either some descendant non-empty text, or else something users can hear (audio elements) or view (video, img, or canvas elements) or otherwise interact with (for example, interactive form controls).

Cite from https://html.spec.whatwg.org/multipage/dom.html#palpable-content

## Rule Details

👎 Examples of **incorrect** code

<!-- prettier-ignore-start -->
```html
<div></div>
<div> </div>
<div>

</div>
```
<!-- prettier-ignore-end -->

👍 Examples of **correct** code

```html
<div>text contet</div>
<div><img src="path/to" alt="image content" /></div>
```

### Interface

- Type: `boolean`

### Options

#### Interface

| Property                   | Type      | Optional | Default Value | Description                                                                                                                                                                                                                                                           |
| -------------------------- | --------- | -------- | ------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `extendsExposableElements` | `boolean` | ✔        | `true`        | Include elements that are not palpable content, but are exposed to the accessibility tree. The palpable content model doesn't include some elements that are `li`, `dt`, `dd`, `th`, `td`, and more. This option exists to that detect those elements that are empty. |
| `ignoreIfAriaBusy`         | `boolean` | ✔        | `true`        | Avoid evaluating it if the element has `aria-busy=true`.                                                                                                                                                                                                              |

### Default severity

`warning`
