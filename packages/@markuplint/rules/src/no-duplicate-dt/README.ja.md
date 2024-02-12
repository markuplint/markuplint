---
description: '`<dl>`内の名前の重複禁止'
---

# `no-duplicate-dt`

<!-- textlint-disable ja-technical-writing/ja-no-mixed-period -->

`<dl>`内の名前の重複禁止

❌ 間違ったコード例

```html
<dl>
  <dt>名前1</dt>
  <dd>内容1</dd>
  <dt>名前1</dt>
  <dd>内容2</dd>
  <div>
    <dt>名前1</dt>
    <dd>内容3</dd>
  </div>
</dl>
```

✅ 正しいコード例

```html
<dl>
  <dt>名前1</dt>
  <dd>内容1</dd>
  <dt>名前2</dt>
  <dd>内容2</dd>
  <div>
    <dt>名前3</dt>
    <dd>内容3</dd>
  </div>
</dl>
```

<!-- textlint-enable ja-technical-writing/ja-no-mixed-period -->
