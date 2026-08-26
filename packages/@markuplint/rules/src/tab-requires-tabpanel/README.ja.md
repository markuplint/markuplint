---
description: アクティブな"tab"ロールの要素に対応する"tabpanel"ロールの要素がない場合に警告します。
---

# `tab-requires-tabpanel`

アクティブな`tab`ロールの要素（`aria-selected="true"`）に対応する`tabpanel`ロールの要素がない場合に警告します。

対応関係は、タブ側の`aria-controls`（`tabpanel`を指す）、または`tabpanel`側の`aria-labelledby`（タブの`id`を指す）のいずれかで解決されます。

<!-- textlint-disable ja-technical-writing/ja-no-mixed-period -->

❌ 間違ったコード例

```html
<div role="tablist">
  <button role="tab" aria-selected="true">Tab</button>
</div>
```

✅ 正しいコード例

```html
<div role="tablist">
  <button role="tab" aria-selected="true" aria-controls="panel">Tab</button>
</div>
<div id="panel" role="tabpanel">Content</div>
```

<!-- textlint-enable ja-technical-writing/ja-no-mixed-period -->
