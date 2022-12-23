---
description: 指定された属性が要素に影響を与えることができない（つまり無意味である）場合は警告します。
---

# `ineffective-attr`

指定された属性が要素に影響を与えることができない（つまり無意味である）場合は警告します。

<!-- textlint-disable ja-technical-writing/ja-no-mixed-period -->

❌ 間違ったコード例

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

✅ 正しいコード例

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

<!-- textlint-enable ja-technical-writing/ja-no-mixed-period -->
