---
id: require-landmark-label
description: ページ内で複数回使用されるランドマークロールに一意のアクセシブルネームがない場合に警告します。
---

# `require-landmark-label`

[APG の Landmark Regions プラクティス](https://www.w3.org/WAI/ARIA/apg/practices/landmark-regions/) に基づき、ランドマークロール(`banner`、`main`、`complementary`、`contentinfo`、`form`、`navigation`、`region`)がドキュメント内で複数回出現し、いずれかに一意のアクセシブルネーム(`aria-label`または`aria-labelledby`)がない場合に警告します。

旧`landmark-roles`ルールから、[`no-nested-top-level-landmark`](/docs/rules/no-nested-top-level-landmark)とともに分割されました。

❌ 間違ったコード例

```html
<!doctype html>
<html>
  <body>
    <nav>...</nav>
    <main>
      <nav>ラベルのない重複したnavランドマーク</nav>
    </main>
  </body>
</html>
```

✅ 正しいコード例

```html
<!doctype html>
<html>
  <body>
    <nav aria-label="main">...</nav>
    <main>
      <nav aria-label="sub">...</nav>
    </main>
  </body>
</html>
```
