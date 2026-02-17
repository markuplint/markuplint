---
id: require-dialog-autofocus
description: Requires a dialog shown via the show-modal command to contain an element with the autofocus attribute
---

# `require-dialog-autofocus`

Requires a `<dialog>` element shown via the `show-modal` command to contain a descendant (or itself) with the `autofocus` attribute.

When a modal dialog is shown via [`showModal()`](https://html.spec.whatwg.org/multipage/interactive-elements.html#dom-dialog-showmodal), the browser moves focus to the first descendant with `autofocus`. Without `autofocus`, focus goes to the `<dialog>` element itself, which is not ideal for accessibility — screen reader users may miss the dialog content, and keyboard users may need extra tab presses to reach interactive elements.

This rule uses the [Invoker Commands API](https://open-ui.org/components/invokers.explainer/) to statically detect modal dialogs: a `<button>` with `command="show-modal"` and `commandfor` pointing to a `<dialog>` element indicates that the dialog will be shown as a modal.

> [!WARNING]
> Default severity is `warning`.

## Rule Details

### :x: Incorrect

```html
<button command="show-modal" commandfor="my-dialog">Open</button>
<dialog id="my-dialog">
  <p>This dialog has no autofocus element.</p>
  <button command="close" commandfor="my-dialog">Close</button>
</dialog>
```

### :o: Correct

```html
<button command="show-modal" commandfor="my-dialog">Open</button>
<dialog id="my-dialog">
  <input type="text" autofocus />
  <button command="close" commandfor="my-dialog">Close</button>
</dialog>
```

```html
<button command="show-modal" commandfor="my-dialog">Open</button>
<dialog id="my-dialog">
  <button autofocus command="close" commandfor="my-dialog">Close</button>
</dialog>
```

## Scope

This rule only checks `<dialog>` elements that are referenced by a `<button>` with `command="show-modal"`. Dialogs that are opened programmatically (via `showModal()` in JavaScript) or dialogs without a declarative trigger are not checked.

Non-dialog elements referenced by `commandfor` are also skipped. The `command` value comparison is case-insensitive per the HTML spec.

## See Also

- [Issue #689](https://github.com/markuplint/markuplint/issues/689)
- [HTML Living Standard: The dialog element](https://html.spec.whatwg.org/multipage/interactive-elements.html#the-dialog-element)
- [Invoker Commands API Explainer](https://open-ui.org/components/invokers.explainer/)
- [MDN: autofocus](https://developer.mozilla.org/en-US/docs/Web/HTML/Global_attributes/autofocus)
