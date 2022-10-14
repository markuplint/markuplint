---
title: No use event handler attribute
id: no-use-event-handler-attr
category: maintainability
---

# No use event handler attribute

Warn when specifying the event handler attribute.

## Rule Details

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

### Interface

- Type: `boolean`
- Default Value: `true`

### Options

#### `ignore`

Specify the event handler to ignore as string or string array.
It accepts even in a regex format.

### Default severity

`warning`
