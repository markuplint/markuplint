---
title: id 属性値のハードコーディング禁止(no-hard-code-id)
---

# id 属性値のハードコーディング禁止(`no-hard-code-id`)

コードが HTML の断片の場合、id 属性値をハードコーディングすると警告します。

## ルールの詳細

👎 間違ったコード例

```jsx
<div id="foo"></div>
```

👍 正しいコード例

```jsx
const id = uid();
<div id={id}></div>;
```

```jsx
const Component = ({ id }) => <div id={id}></div>;
```

### 設定値

- 型: `boolean`
- デフォルト値: `true`

### デフォルトの警告の厳しさ

`warning`
