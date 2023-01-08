---
id: require-datetime
description: Warn to need the datetime attribute if the time element has invalid content.
---

# `require-datetime`

Warn to need the datetime attribute if the time element has invalid content.

> The time element represents its contents, along with a machine-readable form of those contents in the datetime attribute. The kind of content is limited to various kinds of dates, times, time-zone offsets, and durations, as described below.
>
> The datetime attribute may be present. If present, its value must be a representation of the element's contents in a machine-readable format.

Cite: [HTML Living Standard 4.5.14 The time element](https://html.spec.whatwg.org/multipage/text-level-semantics.html#the-time-element:~:text=The%20time%20element%20represents,a%20machine%2Dreadable%20format.)

<!-- prettier-ignore-start -->

❌ Examples of **incorrect** code for this rule

```html
<time>1/5/2023</time>
<time>Today</time>
<time>令和5年1月5日</time>
```

✅ Examples of **correct** code for this rule

```html
<time>2023-01-05</time>
<time datetime="2023-01-05">1/5/2023</time>
<time datetime="2023-01-05">Today</time>
<time datetime="2023-01-05">令和5年1月5日</time>
```

<!-- prettier-ignore-end -->
