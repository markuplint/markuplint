---
description: banner、main、complementaryおよびcontentinfoがトップレベルのランドマークか。特定のランドマークロールがページで複数回使用される場合、一意のラベルがあるか。
---

# `landmark-roles`

- `banner`、`main`、`complementary`および`contentinfo`がトップレベルのランドマークか
- 特定のランドマークロールがページで複数回使用される場合、一意のラベルがあるか
- ~~知覚可能コンテンツがいずれかのランドマーク上に存在するか~~（実装中）

以上を確認して満たされていない場合は警告します。

W3Cの[Landmark Regions](https://www.w3.org/WAI/ARIA/apg/practices/landmark-regions/)を参考にしています。

<!-- textlint-disable ja-technical-writing/ja-no-mixed-period -->

❌ 間違ったコード例

```html
<!DOCTYPE html>
<html>
  <body>
    <header>...</header>
    <nav>...</nav>
    <main>
      <header>...</header>
      <footer>...</footer>
      <nav>ラベルのない重複するnavigationランドマーク</nav>
      <aside>トップレベルにないcomplementaryランドマーク</aside>
    </main>
    <footer>...</footer>
  </body>
</html>
```

✅ 正しいコード例

```html
<!DOCTYPE html>
<html>
  <body>
    <header>...</header>
    <nav aria-label="メイン">...</nav>
    <main>
      <header>...</header>
      <footer>...</footer>
      <nav aria-label="サブ">...</nav>
    </main>
    <aside>...</aside>
    <footer>...</footer>
  </body>
</html>
```

<!-- textlint-enable ja-technical-writing/ja-no-mixed-period -->
