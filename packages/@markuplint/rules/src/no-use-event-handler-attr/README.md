---
title: No use event handler attribute
id: no-use-event-handler-attr
category: maintainability
severity: warning
---

# No use event handler attribute

Warn when specifying the event handler attribute.

👎 Examples of **incorrect** code for this rule

```html
<div onclick="() => doSomething()">Click</div>
```

👍 Examples of **correct** code for this rule

```html
<div id="foo">Click</div>

<script>
  document.getElementById('foo').addEventListener('click', () => doSomething());
</script>
```
