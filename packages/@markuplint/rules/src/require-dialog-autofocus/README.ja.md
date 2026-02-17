---
description: show-modal コマンドで表示される dialog 要素に autofocus 属性を持つ要素が必要です
---

# `require-dialog-autofocus`

<!-- textlint-disable ja-technical-writing/ja-no-mixed-period -->

`show-modal` コマンドで表示される `<dialog>` 要素に、`autofocus` 属性を持つ子孫要素（または自身）が必要です。

[`showModal()`](https://html.spec.whatwg.org/multipage/interactive-elements.html#dom-dialog-showmodal) でモーダルダイアログが表示される際、ブラウザは `autofocus` を持つ最初の子孫要素にフォーカスを移します。`autofocus` がない場合、`<dialog>` 要素自体にフォーカスが当たりますが、これはアクセシビリティ上望ましくありません。スクリーンリーダーのユーザーがダイアログの内容を見落とす可能性があり、キーボードユーザーはインタラクティブな要素に到達するために余分なタブ操作が必要になります。

このルールは [Invoker Commands API](https://open-ui.org/components/invokers.explainer/) を使用してモーダルダイアログを静的に検出します。`command="show-modal"` と `commandfor` で `<dialog>` 要素を参照する `<button>` がある場合、そのダイアログがモーダルとして表示されることを示します。

> [!WARNING]
> デフォルトの重大度は `warning` です。

## ルール詳細

### :x: 不正

```html
<button command="show-modal" commandfor="my-dialog">開く</button>
<dialog id="my-dialog">
  <p>このダイアログには autofocus 要素がありません。</p>
  <button command="close" commandfor="my-dialog">閉じる</button>
</dialog>
```

### :o: 正しい

```html
<button command="show-modal" commandfor="my-dialog">開く</button>
<dialog id="my-dialog">
  <input type="text" autofocus />
  <button command="close" commandfor="my-dialog">閉じる</button>
</dialog>
```

```html
<button command="show-modal" commandfor="my-dialog">開く</button>
<dialog id="my-dialog">
  <button autofocus command="close" commandfor="my-dialog">閉じる</button>
</dialog>
```

## スコープ

このルールは `command="show-modal"` を持つ `<button>` から参照される `<dialog>` 要素のみをチェックします。JavaScript で `showModal()` を呼び出してプログラム的に開かれるダイアログや、宣言的なトリガーのないダイアログはチェックされません。

`commandfor` で参照される非 dialog 要素もスキップされます。`command` 値の比較は HTML 仕様に従い大文字小文字を区別しません。

## 関連

- [Issue #689](https://github.com/markuplint/markuplint/issues/689)
- [HTML Living Standard: dialog 要素](https://html.spec.whatwg.org/multipage/interactive-elements.html#the-dialog-element)
- [Invoker Commands API Explainer](https://open-ui.org/components/invokers.explainer/)
- [MDN: autofocus](https://developer.mozilla.org/en-US/docs/Web/HTML/Global_attributes/autofocus)

<!-- textlint-enable ja-technical-writing/ja-no-mixed-period -->
