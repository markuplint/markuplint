---
description: 属性がひとつの要素の中で重複していたら警告します。大文字小文字を区別しません。
---

# `attr-duplication`

**属性**がひとつの要素の中で重複していたら警告します。大文字小文字を区別しません。

<!-- textlint-disable ja-technical-writing/ja-no-mixed-period -->

> 名前が互いにASCII大文字・小文字不区別で一致する同じ開始タグで2つ以上の属性があってはならない。

[HTML Living Standard 13.1.2.3 属性](https://momdo.github.io/html/syntax.html#attributes-2:~:text=%E5%90%8D%E5%89%8D%E3%81%8C%E4%BA%92%E3%81%84%E3%81%ABASCII%E5%A4%A7%E6%96%87%E5%AD%97%E3%83%BB%E5%B0%8F%E6%96%87%E5%AD%97%E4%B8%8D%E5%8C%BA%E5%88%A5%E3%81%A7%E4%B8%80%E8%87%B4%E3%81%99%E3%82%8B%E5%90%8C%E3%81%98%E9%96%8B%E5%A7%8B%E3%82%BF%E3%82%B0%E3%81%A72%E3%81%A4%E4%BB%A5%E4%B8%8A%E3%81%AE%E5%B1%9E%E6%80%A7%E3%81%8C%E3%81%82%E3%81%A3%E3%81%A6%E3%81%AF%E3%81%AA%E3%82%89%E3%81%AA%E3%81%84%E3%80%82)より引用

❌ 間違ったコード例

```html
<div data-attr="value" data-Attr="db"></div>
```

✅ 正しいコード例

```html
<div data-attr="value" data-Attr2="db"></div>
```

<!-- textlint-enable ja-technical-writing/ja-no-mixed-period -->
