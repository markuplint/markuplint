---
id: no-nested-top-level-landmark
description: banner、main、contentinfoが他のランドマーク内に入れ子になっている場合に警告します。
---

# `no-nested-top-level-landmark`

[APG の Landmark Regions プラクティス](https://www.w3.org/WAI/ARIA/apg/practices/landmark-regions/) に基づき、`banner`、`main`、`contentinfo` ランドマークが他のランドマーク内に入れ子になっている場合に警告します。これらのロールはトップレベルのランドマークであるべきです。

旧`landmark-roles`ルールから、[`require-landmark-label`](/docs/rules/require-landmark-label)とともに分割されました。

APG は `complementary` もトップレベルであることを要求していますが、このルールは意図的にそれをチェックしません。`<aside>` の暗黙のロールは ARIA 1.3 では条件付きです(特定のセクショニング祖先の内側では `generic` に降格し、`complementary` にはなりません)。このルールのセレクタベースの検出では両者を区別できないため、[ARIA 移行ガイド](/docs/migration/v4-to-v5/aria#aside-conditional-role-mapping-aria-13)に記載の経緯によりチェック対象から外されています。

❌ 間違ったコード例

```html
<!doctype html>
<html>
  <body>
    <header></header>
    <main>
      <main>入れ子になったmainランドマーク</main>
    </main>
  </body>
</html>
```

✅ 正しいコード例

```html
<!doctype html>
<html>
  <body>
    <header></header>
    <main>...</main>
    <aside>...</aside>
  </body>
</html>
```

## `ignoreRoles`

**型:** `("banner" | "main" | "complementary" | "contentinfo" | "form" | "navigation" | "region")[]`
**デフォルト:** `[]`

指定したランドマークロールをチェックの対象から除外します。このルールがチェックするのは `banner`、`main`、`contentinfo` のみのため、それ以外の値は効果がありません。
