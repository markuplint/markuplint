---
description: DOCTYPEが含まれていないと警告します。
---

# `doctype`

DOCTYPEが含まれていないと警告します。また、古い廃止されたDOCTYPEを記述していた場合にも警告します。

<!-- textlint-disable ja-technical-writing/ja-no-mixed-period -->

❌ 間違ったコード例

<!-- prettier-ignore-start -->
```html
<html>
  <head>
    <title>Any Page</title>
  </head>
  <body>
    <h1>Any Page</h1>
    <p>Anonymous</p>
  </body>
</html>
```
<!-- prettier-ignore-end -->

✅ 正しいコード例

<!-- prettier-ignore-start -->
```html
<!doctype html>
<html>
  <head>
    <title>Any Page</title>
  </head>
  <body>
    <h1>Any Page</h1>
    <p>Anonymous</p>
  </body>
</html>
```
<!-- prettier-ignore-end -->

<!-- textlint-enable ja-technical-writing/ja-no-mixed-period -->
