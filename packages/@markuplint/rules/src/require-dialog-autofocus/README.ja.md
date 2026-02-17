---
description: show-modal コマンドで表示される dialog 要素に autofocus 属性を持つ要素が必要です
---

# `require-dialog-autofocus`

<!-- textlint-disable ja-technical-writing/ja-no-mixed-period -->

`show-modal` コマンドで表示される `<dialog>` 要素に、`autofocus` 属性を持つ子孫要素（または自身）が必要です。

[`showModal()`](https://html.spec.whatwg.org/multipage/interactive-elements.html#dom-dialog-showmodal) でモーダルダイアログが表示される際、ブラウザは[ダイアログフォーカスステップ](https://html.spec.whatwg.org/multipage/interactive-elements.html#dialog-focusing-steps)を実行します。`autofocus` がない場合、`<dialog>` 要素自体にフォーカスがフォールバックします。動作上は問題ありませんが、アクセシビリティ上望ましくありません。スクリーンリーダーのユーザーがダイアログの内容を見落とす可能性があり、キーボードユーザーはインタラクティブな要素に到達するために余分なタブ操作が必要になります。

> 著者は、ダイアログが開いた後にユーザーがすぐに操作することが期待される子孫要素に、autofocus属性を使用すべきである。

[HTML Living Standard: dialog要素](https://html.spec.whatwg.org/multipage/interactive-elements.html#the-dialog-element)より引用

このルールは [Invoker Commands API](https://open-ui.org/components/invokers.explainer/) を使用してモーダルダイアログを静的に検出します。`command="show-modal"` と `commandfor` で `<dialog>` 要素を参照する `<button>` がある場合、そのダイアログがモーダルとして表示されることを示します。

> [!WARNING]
> デフォルトの重大度は `warning` です。HTML仕様では `autofocus` の使用は「推奨（should）」であり「必須（must）」ではないためです。`autofocus` がなくても、ダイアログフォーカスステップのフォールバックによりダイアログ要素またはその最初のフォーカス可能な子孫にフォーカスが移動します。

> [!NOTE]
> このルールは [Invoker Commands API](https://developer.mozilla.org/en-US/docs/Web/API/Invoker_Commands_API)（`command`/`commandfor` 属性）に依存しています。この API を使用していない場合（例: JavaScript で `dialog.showModal()` を呼び出してダイアログを開く場合）、このルールは違反を検出しません。Invoker Commands API は2026年初頭に [Baseline サポート](https://developer.mozilla.org/en-US/docs/Web/API/Invoker_Commands_API)を達成しました。

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
<!-- 子孫の input に autofocus -->
<button command="show-modal" commandfor="my-dialog">開く</button>
<dialog id="my-dialog">
  <input type="text" autofocus />
  <button command="close" commandfor="my-dialog">閉じる</button>
</dialog>
```

```html
<!-- 子孫の button に autofocus -->
<button command="show-modal" commandfor="my-dialog">開く</button>
<dialog id="my-dialog">
  <button autofocus command="close" commandfor="my-dialog">閉じる</button>
</dialog>
```

```html
<!-- dialog 自身に autofocus -->
<button command="show-modal" commandfor="my-dialog">開く</button>
<dialog id="my-dialog" autofocus>
  <p>インタラクティブ要素のないコンテンツ。</p>
</dialog>
```

## スコープ

このルールは `command="show-modal"` を持つ `<button>` から参照される `<dialog>` 要素のみをチェックします。他の `command` 値（`close`、`toggle-popover` など）は対象外です。

JavaScript で `showModal()` を呼び出してプログラム的に開かれるダイアログや、宣言的なトリガーのないダイアログはチェックされません。**Invoker Commands API を使用していないプロジェクトでは、このルールは違反を報告しません。**

`commandfor` で参照される非 dialog 要素もスキップされます。`command` 値の比較は HTML 仕様に従い大文字小文字を区別しません。

## 関連

- [Issue #689](https://github.com/markuplint/markuplint/issues/689)
- [HTML Living Standard: dialog 要素](https://html.spec.whatwg.org/multipage/interactive-elements.html#the-dialog-element)
- [HTML Living Standard: ダイアログフォーカスステップ](https://html.spec.whatwg.org/multipage/interactive-elements.html#dialog-focusing-steps)
- [WAI-ARIA APG: モーダルダイアログパターン](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/)
- [Invoker Commands API Explainer](https://open-ui.org/components/invokers.explainer/)
- [MDN: autofocus](https://developer.mozilla.org/en-US/docs/Web/HTML/Global_attributes/autofocus)

<!-- textlint-enable ja-technical-writing/ja-no-mixed-period -->
