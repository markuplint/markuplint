---
description: id 属性値のハードコーディング禁止
---

# `no-hard-code-id`

コードがHTMLの断片の場合、id属性値をハードコーディングすると警告します。

<!-- textlint-disable ja-technical-writing/ja-no-mixed-period -->

❌ 間違ったコード例

```jsx
<div id="foo"></div>
```

✅ 正しいコード例

```jsx
const id = uid();
<div id={id}></div>;
```

```jsx
const Component = ({ id }) => <div id={id}></div>;
```

<!-- textlint-enable ja-technical-writing/ja-no-mixed-period -->
