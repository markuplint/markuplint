---
id: ineffective-attr
description: Warn that if the attribute specified cannot affect (in other words, mean-less) the element.
fixable: true
category: style
severity: warning
---

# `ineffective-attr`

Warn that if the attribute specified cannot affect (in other words, mean-less) the element.

❌ Examples of **incorrect** code for this rule

```html
<script type="module" src="/path/to/script.js" defer></script>

<script defer>
  const code = 'It is inline';
</script>

<script type="module" async>
  export const code = 'It is inline module';
</script>

<script async>
  const code = 'It is inline';
</script>
```

✅ Examples of **correct** code for this rule

```html
<script type="module" src="/path/to/script.js"></script>

<script>
  const code = 'It is inline';
</script>

<script type="module" async>
  export const code = 'It is inline module';
</script>

<script>
  const code = 'It is inline';
</script>
```
