---
id: no-event-handler-attr
description: Warn when specifying the event handler attribute.
---

# `no-event-handler-attr`

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

## Details

### Setting value

Type: `boolean` | `string[]`

- `true` (default): Disallow all event handler attributes.
- `string[]`: Disallow only the specified events. Event handlers not listed will be allowed. Event names should be lowercase without the `on` prefix (e.g. `"click"`, not `"onclick"`). A regex pattern (e.g. `/^mouse/`) is also accepted.

```json class=config
{
  "rules": {
    "no-event-handler-attr": true
  }
}
```

To disallow only specific events:

```json class=config
{
  "rules": {
    "no-event-handler-attr": ["click"]
  }
}
```

```json class=config
{
  "rules": {
    "no-event-handler-attr": ["click", "mousedown"]
  }
}
```

Using a regex pattern:

```json class=config
{
  "rules": {
    "no-event-handler-attr": ["/^mouse/"]
  }
}
```

### `ignore` option

The `ignore` option excludes specific attributes by their **full attribute name** (with the `on` prefix, e.g. `"onclick"`). It is evaluated before the `value` filter. Both a plain string and a regex pattern are accepted.

```json class=config
{
  "rules": {
    "no-event-handler-attr": {
      "value": ["click", "mousedown"],
      "options": {
        "ignore": "onclick"
      }
    }
  }
}
```

In the example above, `onclick` is excluded by `ignore`, so only `onmousedown` is reported.
