---
description: ドキュメントにDOCTYPEが含まれていない場合に警告します。
id: require-doctype
---

# `require-doctype`

ドキュメントにDOCTYPEが含まれていない場合に警告します。要素の断片は対象外です。

古い形式のpublic/system識別子を持つDOCTYPEは[`no-obsolete-doctype`](/docs/rules/no-obsolete-doctype)の担当であり、このルールの対象ではありません — 廃止された形式であっても、DOCTYPEが存在すればこのルールは満たされます。

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
