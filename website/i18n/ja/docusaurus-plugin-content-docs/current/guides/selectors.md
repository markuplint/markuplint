# セレクタの理解

[部分的な適用](applying-rules#applying-to-some)をする場合には、**セレクタ**を設定する必要があります。セレクタの構文は、**CSSセレクタ**と同じものや、Markuplint独自の拡張構文などをサポートしています。そのため、とても柔軟に要素を選択できます。

## CSSセレクタ

[**W3C Selectors Level 4**](https://www.w3.org/TR/selectors-4/)の一部をサポートしています。

<details>
<summary>対応しているセレクタとオペレータ</summary>

<!-- textlint-disable ja-technical-writing/max-kanji-continuous-len -->

| 種類                               | サンプルコード                                                                            | サポート |
| ---------------------------------- | ----------------------------------------------------------------------------------------- | -------- |
| 全称セレクタ                       | `*`                                                                                       | ✅       |
| 要素型セレクタ                     | `div`                                                                                     | ✅       |
| IDセレクタ                         | `#id`                                                                                     | ✅       |
| クラスセレクタ                     | `.class`                                                                                  | ✅       |
| 属性セレクタ                       | `[data-attr]`                                                                             | ✅       |
| 属性セレクタ（完全一致）           | `[data-attr=value]`                                                                       | ✅       |
| 属性セレクタ（スペース区切り一致） | `[data-attr~=value]`                                                                      | ✅       |
| 属性セレクタ（サブコード一致）     | <code>[data-attr\|=value]</code>                                                          | ✅       |
| 属性セレクタ（部分一致）           | `[data-attr*=value]`                                                                      | ✅       |
| 属性セレクタ（先頭一致）           | `[data-attr^=value]`                                                                      | ✅       |
| 属性セレクタ（末尾一致）           | `[data-attr$=value]`                                                                      | ✅       |
| not擬似クラス                      | `:not(div)`                                                                               | ✅       |
| is擬似クラス                       | `:is(div)`                                                                                | ✅       |
| where擬似クラス                    | `:where(div)`                                                                             | ✅       |
| has擬似クラス                      | `:has(div)` `:has(> div)`                                                                 | ✅       |
| dir擬似クラス                      | `:dir(ltr)`                                                                               | ❌       |
| lang擬似クラス                     | `:lang(en)`                                                                               | ❌       |
| any-link擬似クラス                 | `:any-link`                                                                               | ❌       |
| リンク擬似クラス                   | `:link` `:visited`                                                                        | ❌       |
| local-link擬似クラス               | `:local-link`                                                                             | ❌       |
| target擬似クラス                   | `:target`                                                                                 | ❌       |
| target-within擬似クラス            | `:target-within`                                                                          | ❌       |
| scope擬似クラス                    | `:scope`                                                                                  | ✅       |
| current擬似クラス                  | `:current` `:current(div)`                                                                | ❌       |
| past擬似クラス                     | `:past`                                                                                   | ❌       |
| future擬似クラス                   | `:future`                                                                                 | ❌       |
| インタラクティブ擬似クラス         | `:active` `:hover` `:focus` `:focus-within` `:focus-visible`                              | ❌       |
| enable擬似クラス                   | `:enable` `:disable`                                                                      | ❌       |
| read-write擬似クラス               | `:read-write` `:read-only`                                                                | ❌       |
| placeholder-shown擬似クラス        | `:placeholder-shown`                                                                      | ❌       |
| default擬似クラス                  | `:default`                                                                                | ❌       |
| checked擬似クラス                  | `:checked`                                                                                | ❌       |
| indeterminate擬似クラス            | `:indeterminate`                                                                          | ❌       |
| valid擬似クラス                    | `:valid` `:invalid`                                                                       | ❌       |
| in-range擬似クラス                 | `:in-range` `:out-of-range`                                                               | ❌       |
| required擬似クラス                 | `:required` `:optional`                                                                   | ❌       |
| blank擬似クラス                    | `:blank`                                                                                  | ❌       |
| user-invalid擬似クラス             | `:user-invalid`                                                                           | ❌       |
| root擬似クラス                     | `:root`                                                                                   | ✅       |
| empty擬似クラス                    | `:empty`                                                                                  | ❌       |
| Nth-child擬似クラス                | `:nth-child(2)` `:nth-last-child(2)` `:first-child` `:last-child` `:only-child`           | ❌       |
| Nth-child擬似クラス (`of El`構文)  | `:nth-child(2 of div)` `:nth-last-child(2 of div)`                                        | ❌       |
| Nth-of-type擬似クラス              | `:nth-of-type(2)` `:nth-last-of-type(2)` `:first-of-type` `:last-of-type` `:only-of-type` | ❌       |
| Nth-col擬似クラス                  | `:nth-col(2)` `:nth-last-col(2)`                                                          | ❌       |
| 疑似要素                           | `::before` `::after`                                                                      | ❌       |
| 子孫結合子                         | `div span`                                                                                | ✅       |
| 子結合子                           | `div > span`                                                                              | ✅       |
| 隣接兄弟結合子                     | `div + span`                                                                              | ✅       |
| 一般兄弟結合子                     | `div ~ span`                                                                              | ✅       |
| 列結合子                           | <code>div \|\| span</code>                                                                | ❌       |
| セレクタリスト                     | `div, span`                                                                               | ✅       |

<!-- textlint-enable ja-technical-writing/max-kanji-continuous-len -->

</details>

:::tip

<!-- textlint-disable ja-technical-writing/max-kanji-continuous-len -->

**`:has`セレクタ**をサポートしています。一般兄弟結合子とつかうことでより柔軟に要素を選択できます。

<!-- textlint-enable ja-technical-writing/max-kanji-continuous-len -->

```json title=":has selector with Subsequent-sibling combinator"
{
  "nodeRules": [
    {
      // <picture> の子で <img> より前に現れるすべての要素に適用
      "selector": "picture img:has(~)",
      "rules": {
        "required-attr": true
      }
    }
  ]
}
```

:::

## 詳細度

**CSSセレクタ**と同じく**詳細度**がを適用されます。これにより、ルールを適用する優先順位を制御できます。

```json title="優先順位の制御"
{
  "nodeRules": [
    {
      // 適用される
      "selector": "#id.class-name", // 詳細度: 1-1-0
      "rules": {
        "required-attr": true
      }
    },
    {
      // 適用されない (除外される)
      "selector": ".class-name", // 詳細度: 0-1-0
      "rules": {
        "required-attr": false
      }
    }
  ]
}
```

:::info

セレクタが同じ詳細度をもつ場合、設定の**順番**に従って適用されます。

:::

:::tip

**`:where`セレクタ**をサポートしています。このセレクタの詳細度は常にゼロになります。

```json title="優先順位の制御"
{
  "nodeRules": [
    {
      // 適用されない
      "selector": ":where(#id.class-name)", // 詳細度: 0-0-0
      "rules": {
        "required-attr": true
      }
    },
    {
      // 適用される（上書き）
      "selector": ".class-name", // 詳細度: 0-1-0
      "rules": {
        "required-attr": false
      }
    }
  ]
}
```

:::

## 拡張セレクタ

Markuplint独自の擬似クラスに似た拡張セレクタをつかうことができます。

- [`:closest`](./selectors#ex-selector-closest)
- [`:aria`](./selectors#ex-selector-aria)
- [`:role`](./selectors#ex-selector-role)
- [`:model`](./selectors#ex-selector-model)

| 構文                  | 機能                                                                                                                                        |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `:closest(selectors)` | [`Element.closest`](https://dom.spec.whatwg.org/#ref-for-dom-element-closest%E2%91%A0)メソッド                                              |
| `:aria(has name)`     | [ARIA擬似クラス](https://github.com/markuplint/markuplint/tree/main/packages/%40markuplint/selector#aria-pseudo-class)                      |
| `:role(heading)`      | [ARIAロール擬似クラス](https://github.com/markuplint/markuplint/tree/main/packages/%40markuplint/selector#aria-pseudo-class)                |
| `:model(interactive)` | [コンテンツモデル擬似クラス](https://github.com/markuplint/markuplint/tree/main/packages/%40markuplint/selector#content-model-pseudo-class) |

:::info

このセレクタは、あくまでも**実験的な機能**です。もちろん、互換性はありません。CSSセレクタと競合した場合は、次のメジャーバージョンで即座に削除されます。

:::

### `:closest` {#ex-selector-closest}

**[`Element.closest`](https://dom.spec.whatwg.org/#ref-for-dom-element-closest%E2%91%A0)メソッドの擬似クラス版**

```
:closest(selectors)
```

セレクタにマッチする祖先を持つ要素に適用されます。

### `:aria` {#ex-selector-aria}

**ARIA擬似クラス**

```
:aria(syntax)
```

| Syntax        | Code                 | Description                                |
| ------------- | -------------------- | ------------------------------------------ |
| `has name`    | `:aria(has name)`    | アクセシブルな名前をもつ要素に適用         |
| `has no name` | `:aria(has no name)` | アクセシブルな名前を**もたない**要素に適用 |

### `:role` {#ex-selector-role}

**ARIAロール擬似クラス**

```
:role(roleName)
:role(roleName|version)
```

たとえば、`:role(button)`は`<button>`と`<div role="button">`にマッチします。

WAI-ARIAのバージョンは`:role(form|1.1)`のようにパイプで区切って指定ができます。

### `:model` {#ex-selector-model}

**コンテンツモデル擬似クラス**

```
:model(contentModel)
```

たとえば、`:model(interactive)`は`<a>`（`href`属性あり）や`<button>`などにマッチします。

## 正規表現セレクタ

**正規表現**を使用して要素を選択します。**ノード名**、**属性名**、**属性値**のいずれかにマッチするように指定するか、それぞれを組み合わせて指定します。

```json
{
  "childNodeRules": [
    {
      "regexSelector": {
        "nodeName": "/^[a-z]+$/",
        "attrName": "/^[a-z]+$/",
        "attrValue": "/^[a-z]+$/"
      },
      "rules": {
        "required-attr": "true"
      }
    }
  ]
}
```

より複雑な要素を選択できます。詳しくは[`regexSelector`](/configuration/properties#regexselector)の設定方法を参照してください。

:::caution

`regexSelector`と`selector`は同時に指定できません。`regexSelector`よりも`selector`が優先されます。

:::
