---
description: WAI-ARIAおよびARIA in HTMLの仕様のとおりrole属性またはaria-*属性が設定されていない場合に警告します。
---

# `wai-aria`

[**WAI-ARIA**](https://momdo.github.io/wai-aria-1.2/)および[**ARIA in HTML**](https://momdo.github.io/html-aria/)の仕様のとおり`role`属性または`aria-*`属性が設定されていない場合に警告します。

次の場合に警告します。

- 明らかな仕様違反
  - 仕様に存在しないロールを指定した場合
  - 抽象ロールを指定した場合
  - 指定したロール（もしくは暗黙のロール）が持たないプロパティ/ステートを指定した場合
  - プロパティ/ステートに無効な値を指定した場合
  - ARIA in HTMLの仕様における要素に許可されていないロールを指定した場合
  - 必須のプロパティ/ステートを指定していない場合
- 推奨されない使い方
  - 非推奨（廃止予定）のロールを指定した場合
  - 非推奨（廃止予定）のプロパティ/ステートを指定した場合
  - ARIA in HTMLの仕様における要素の暗黙のロールを明示的に指定した場合
  - ARIA in HTMLの仕様において、HTMLの属性と同等の意味を持つプロパティ/ステートを指定した場合
- プリファレンス
  - プロパティ/ステートのデフォルト値を明示的に指定した場合

<!-- textlint-disable ja-technical-writing/ja-no-mixed-period -->

❌ 間違ったコード例

```html
<div role="landmark" aria-busy="busy">
  <ul>
    <li role="button">an item</li>
  </ul>
  <button aria-checked="true">Click me!</button>
</div>
```

✅ 正しいコード例

```html
<div role="banner" aria-busy="true">
  <ul>
    <li role="menuitemcheckbox">an item</li>
  </ul>
  <button aria-pressed="true">Click me!</button>
</div>
```

---

## 設定例

ブラウザのサポート状況や支援技術の振る舞いで調整が必要な場合の例を挙げます。

以下はSafariとVoiceOverの環境で、SVGを読み込んでいる`img`要素に`role="img"`が必要な場合に、`disallowSetImplicitRole`を無効化する例です。（この問題は[この課題](https://bugs.webkit.org/show_bug.cgi?id=145263)に基づいています）

```json class=config
{
  "rules": {
    "wai-aria": true
  },
  "nodeRules": [
    {
      "selector": "img[src$=.svg]",
      "rules": {
        // 暗黙のロールを許可する
        "wai-aria": {
          "options": {
            "disallowSetImplicitRole": false
          }
        },
        // role属性を必須とする
        "required-attr": "role",
        // role属性の値をimgのみとする
        "invalid-attr": {
          "options": {
            "allowAttrs": [
              {
                "name": "role",
                "value": {
                  "enum": ["img"]
                }
              }
            ]
          }
        }
      }
    }
  ]
}
```

セレクタ`img[src$=.svg]`を指定してSVGを読み込んでいる要素に**限定して**ルールを設定します。そして、 `disallowSetImplicitRole`オプションを無効化することで、`img`要素の暗黙のロールである`role="img"`の指定を**許可**します。

<!-- textlint-disable ja-technical-writing/sentence-length -->

さらに、`required-attr`ルールで `role`属性の指定を必須とし、`invalid-attr`ルールで`role`属性の値を`img`のみ許可することで、`img[src$=.svg]`の要素に`role="img"`を付加することを促すことができます。

<!-- textlint-enable ja-technical-writing/sentence-length -->

<!-- textlint-enable ja-technical-writing/ja-no-mixed-period -->
