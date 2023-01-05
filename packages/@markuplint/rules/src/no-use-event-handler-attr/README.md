---
id: no-use-event-handler-attr
description: Warn when specifying the event handler attribute.
---

# `no-use-event-handler-attr`

Warn when specifying the event handler attribute.

❌ Examples of **incorrect** code for this rule

```html
<div onclick="() => doSomething()">Click</div>
```

✅ Examples of **correct** code for this rule

```html
<div id="foo">Click</div>

<script>
  document.getElementById('foo').addEventListener('click', () => doSomething());
</script>
```
