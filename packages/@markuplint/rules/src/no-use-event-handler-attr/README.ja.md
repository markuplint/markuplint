---
description: イベントハンドラ属性を指定すると警告します。
---

# `no-use-event-handler-attr`

イベントハンドラ属性を指定すると警告します。

<!-- textlint-disable ja-technical-writing/ja-no-mixed-period -->

❌ 間違ったコード例

```html
<div onclick="() => doSomething()">Click</div>
```

✅ 正しいコード例

```html
<div id="foo">Click</div>

<script>
  document.getElementById('foo').addEventListener('click', () => doSomething());
</script>
```

<!-- textlint-enable ja-technical-writing/ja-no-mixed-period -->
