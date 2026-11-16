---
description: 子孫がプレゼンテーショナルになるロールの要素にaria-owns属性を指定することを禁止します。
---

# `no-aria-owns-on-presentational-children`

`button`、`checkbox`、`img`、`option`、`switch`、`tab`など、子孫がプレゼンテーショナルになるロールの要素にaria-owns属性を指定することを禁止します。

> Authors MUST NOT specify aria-owns on an element which has Presentational Children.

[WAI-ARIA §5.2.9 Children Presentational](https://w3c.github.io/aria/#childrenArePresentational)より引用

ロールは、暗黙・明示を問わず要素が持つロールです。`<div role="button">`と同じく、`<button>`の子孫もプレゼンテーショナルになります。WAI-ARIA 1.1と1.2にはこの要件の記述がありませんが、ARIAのバージョンにかかわらず警告します。

<!-- textlint-disable ja-technical-writing/ja-no-mixed-period -->

❌ 間違ったコード例

```html
<button type="button" aria-owns="save-icon">Save</button> <span id="save-icon"></span>
```

✅ 正しいコード例

```html
<button type="button"><span></span>Save</button>
```

<!-- textlint-enable ja-technical-writing/ja-no-mixed-period -->
