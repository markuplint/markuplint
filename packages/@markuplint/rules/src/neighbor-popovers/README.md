---
id: neighbor-popovers
description: Warns when popover triggers and their corresponding targets are not adjacent
---

# `neighbor-popovers`

Warns when popover triggers and their corresponding targets are not adjacent.

> Whenever possible ensure the popover element is placed immediately after its triggering element in the DOM. Doing so will help ensure that the popover is exposed in a logical programmatic reading order for users of assistive technology, such as screen readers.

Cite: [HTML Living Standard 6.12.1 The popover target attributes](https://html.spec.whatwg.org/multipage/popover.html#the-popover-target-attributes:~:text=Whenever%20possible%20ensure%20the%20popover%20element%20is%20placed%20immediately%20after%20its%20triggering%20element%20in%20the%20DOM.%20Doing%20so%20will%20help%20ensure%20that%20the%20popover%20is%20exposed%20in%20a%20logical%20programmatic%20reading%20order%20for%20users%20of%20assistive%20technology%2C%20such%20as%20screen%20readers.)

❌ Examples of **incorrect** code for this rule

```html
<button popovertarget="foo">Trigger</button>
<p>There are perceptible nodes between the trigger and corresponding target.</p>
<div id="foo" popover>Popover</div>
```

```html
<div>
  <button popovertarget="foo">Trigger</button>
  <input type="text" /><!-- Focusable element is considered perceptible elements. -->
</div>

<div>
  <div>
    <div id="foo" popover>Popover</div>
  </div>
</div>
```

✅ Examples of **correct** code for this rule

```html
<button popovertarget="foo">Trigger</button>
<div id="foo" popover>Popover</div>
```

```html
<div>
  <button popovertarget="foo">Trigger</button>
</div>

<div>
  <div>
    <div id="foo" popover>Popover</div>
  </div>
</div>
```

```html
<div>
  <button popovertarget="foo">Trigger</button>
</div>

<div>
  <div>
    <img src="image.png" alt="" /><!-- Images without accname are considered non-perceptible elements. -->
    <div id="foo" popover>Popover</div>
  </div>
</div>
```
