---
description: 連続する`<br>`の使用に対して警告します
---

# `no-consecutive-br`

<!-- textlint-disable ja-technical-writing/ja-no-mixed-period -->

連続する`<br>`の使用に対して警告します。

❌ 間違ったコード例

```html
<p>
  A...<br />
  <br />
  B...
</p>
```

✅ 正しいコード例

```html
<p>A...</p>
<p>B...</p>
```

<!-- textlint-enable ja-technical-writing/ja-no-mixed-period -->
