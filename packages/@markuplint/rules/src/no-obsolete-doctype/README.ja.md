---
description: ドキュメントが廃止されたDOCTYPEを宣言している場合に警告します。
id: no-obsolete-doctype
---

# `no-obsolete-doctype`

ドキュメントが廃止されたDOCTYPEを宣言している場合に警告します — public識別子を持つもの、あるいはHTML Living Standardがなお許容する唯一のlegacy文字列の例外以外のsystem識別子を持つものが対象です。

DOCTYPEが完全に欠落している場合は[`require-doctype`](/docs/rules/require-doctype)の担当であり、このルールの対象ではありません。

❌ 間違ったコード例

```html
<!DOCTYPE html PUBLIC "-//W3C//DTD HTML 4.01//EN" "http://www.w3.org/TR/html4/strict.dtd">
```

✅ 正しいコード例

```html
<!doctype html>
```

:::note
[HTML Living Standard §13.1.1](https://html.spec.whatwg.org/multipage/syntax.html#the-doctype)は、システムによる古いパーサーとの互換性のために、以下のlegacy文字列の1形式のみを準拠する例外として許容しています:

```html
<!DOCTYPE html SYSTEM "about:legacy-compat">
```

このルールはこれを検出しません。
:::
