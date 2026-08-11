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
  - ロールが必要とする子ロールを持たない場合（例: `table`は`row`を必要とする）
  - ロールが必要とする親コンテキストの外に配置された場合（例: `tablist`の祖先を持たない`tab`）
  - アクティブな`tab`ロールに対応する`tabpanel`ロールがない場合
- 推奨されない使い方
  - 非推奨（廃止予定）のロールを指定した場合
  - 非推奨（廃止予定）のプロパティ/ステートを指定した場合
  - ARIA in HTMLの仕様における要素の暗黙のロールを明示的に指定した場合
  - ARIA in HTMLの仕様において、HTMLの属性と同等の意味を持つプロパティ/ステートを指定した場合
- プリファレンス
  - プロパティ/ステートのデフォルト値を明示的に指定した場合
- オプションチェック（デフォルトで無効）
  - childrenPresentationalを持つロールの子孫要素にARIA属性を指定した場合
  - `aria-hidden`で非表示にされたフォーカス可能なインタラクティブ要素を使用した場合

<!-- textlint-disable ja-technical-writing/ja-no-mixed-period -->

> [!TIP]
> このルールは、きめ細かなseverity制御のために個別のサブルールに分割されました。
> `markuplint:a11y`プリセットを使用すると、各チェックが独立したルール
> （例: `wai-aria-non-existent-role`、`wai-aria-implicit-role`）として実行されます。
> `wai-aria: true`を使用すれば、従来通り全てのチェックをまとめて有効化できます。

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

## オプション

### `checkingRequiredAccessibilityParentRole`

型: `boolean`（デフォルト: `true`）

明示的な`role`属性を持つ要素が、ARIA仕様で定義された正しい親コンテキスト内に配置されているかを検証します（ARIA 1.3の「Required Accessibility Parent Role」/ ARIA 1.2の「Required Context Role」）。

例えば、`tab`ロールは`tablist`の祖先を必要とし、`option`ロールは`listbox`の祖先を必要とします。

`false`に設定すると、このチェックは無効になります。

```json class=config
{
  "rules": {
    "wai-aria": {
      "options": {
        "checkingRequiredAccessibilityParentRole": false
      }
    }
  }
}
```

> [!NOTE]
> 明示的なロール（`role`属性で設定されたもの）のみがチェックされます。暗黙のロールは、ネイティブHTMLの親子関係がHTML仕様によって保証されているためスキップされます。

### `checkingTabRequiresTabpanel`

型: `boolean`（デフォルト: `true`）

ARIA仕様の`tab`ロールの要件に従い、アクティブな`tab`ロールの要素（`aria-selected="true"`）が対応する`tabpanel`ロールの要素を持っているかを検証します。

対応関係は、タブ側の`aria-controls`（`tabpanel`を指す）、または`tabpanel`側の`aria-labelledby`（タブの`id`を指す）のいずれかで解決されます。

`false`に設定すると、このチェックは無効になります。

```json class=config
{
  "rules": {
    "wai-aria": {
      "options": {
        "checkingTabRequiresTabpanel": false
      }
    }
  }
}
```

## 既知の制限事項

- **`aria-owns`は考慮されません。** 親コンテキストチェックはDOMの`parentElement`チェーンのみを走査します。リモートの祖先の`aria-owns`で参照された要素は、その祖先のアクセシビリティの子要素として扱われません。
- **Shadow DOM境界は越えません。** 親コンテキストチェックはライトDOMツリーのみを走査します。Shadow DOMホスト境界は考慮されません。
- **二重違反の報告。** ロールの必須親コンテキストが満たされない場合、`checkingRequiredAccessibilityParentRole`（子側）と`checkingAllowedAccessibilityChildRoles`（親側）の両方が同じ構造上の問題に対して違反を報告することがあります。重複レポートを避けたい場合は、いずれかのオプションを無効化してください。一般的には、子側のチェック（`checkingRequiredAccessibilityParentRole`）を残すことを推奨します。移動が必要な要素に対して違反が報告されるためです。

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

> [!IMPORTANT]
> `<img>` には必ず `alt` 属性（または `aria-label`）を付与してください。[ARIA in HTML](https://w3c.github.io/html-aria/#el-img) によると、アクセシブル名を持たない `<img>` は「No role permitted」となり、`permittedAriaRoles` が `role="img"` を拒否します。上記の例は SVG 画像が alt テキストを持つことを前提としています。

<!-- textlint-enable ja-technical-writing/ja-no-mixed-period -->
