---
id: require-dialog-autofocus
description: Requires a dialog shown via the show-modal command to contain an element with the autofocus attribute
---

# `require-dialog-autofocus`

Requires a `<dialog>` element shown via the `show-modal` command to contain a descendant (or itself) with the `autofocus` attribute.

When a modal dialog is shown via [`showModal()`](https://html.spec.whatwg.org/multipage/interactive-elements.html#dom-dialog-showmodal), the browser executes the [dialog focusing steps](https://html.spec.whatwg.org/multipage/interactive-elements.html#dialog-focusing-steps). Without `autofocus`, focus falls back to the `<dialog>` element itself. While functional, this is not ideal for accessibility — screen reader users may miss the dialog content, and keyboard users may need extra tab presses to reach interactive elements.

> Authors should use the autofocus attribute on the descendant element of the dialog that the user is expected to immediately interact with after the dialog opens.

Cite: [HTML Living Standard: The dialog element](https://html.spec.whatwg.org/multipage/interactive-elements.html#the-dialog-element)

This rule uses the [Invoker Commands API](https://open-ui.org/components/invokers.explainer/) to statically detect modal dialogs: a `<button>` with `command="show-modal"` and `commandfor` pointing to a `<dialog>` element indicates that the dialog will be shown as a modal.

> [!WARNING]
> Default severity is `warning` because the HTML spec recommends (`should`) but does not require (`must`) the use of `autofocus`. Without `autofocus`, the dialog focusing steps still provide a fallback that moves focus to the dialog element or its first focusable descendant.

> [!NOTE]
> This rule relies on the [Invoker Commands API](https://developer.mozilla.org/en-US/docs/Web/API/Invoker_Commands_API) (`command`/`commandfor` attributes). If your project does not use this API (e.g., you open dialogs via `dialog.showModal()` in JavaScript), this rule will not detect any violations. The Invoker Commands API reached [Baseline support](https://developer.mozilla.org/en-US/docs/Web/API/Invoker_Commands_API) in early 2026.

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
<!-- autofocus on an input descendant -->
<button command="show-modal" commandfor="my-dialog">Open</button>
<dialog id="my-dialog">
  <input type="text" autofocus />
  <button command="close" commandfor="my-dialog">Close</button>
</dialog>
```

```html
<!-- autofocus on a button descendant -->
<button command="show-modal" commandfor="my-dialog">Open</button>
<dialog id="my-dialog">
  <button autofocus command="close" commandfor="my-dialog">Close</button>
</dialog>
```

```html
<!-- autofocus on the dialog itself -->
<button command="show-modal" commandfor="my-dialog">Open</button>
<dialog id="my-dialog" autofocus>
  <p>Content without interactive elements.</p>
</dialog>
```

## Scope

This rule only checks `<dialog>` elements that are referenced by a `<button>` with `command="show-modal"`. Other `command` values (e.g., `close`, `toggle-popover`) are not in scope.

Dialogs that are opened programmatically (via `showModal()` in JavaScript) or dialogs without a declarative trigger are not checked. **If your project does not use the Invoker Commands API, this rule will not report any violations.**

Non-dialog elements referenced by `commandfor` are also skipped. The `command` value comparison is case-insensitive per the HTML spec.

## Known Limitations

- **JavaScript-triggered dialogs**: Dialogs opened via `dialog.showModal()` in JavaScript without the Invoker Commands API cannot be detected by static analysis.
- **Dynamic `autofocus`**: If `autofocus` is added dynamically via JavaScript (e.g., `element.setAttribute('autofocus', '')`), this rule cannot detect it.
- **Focus placement quality**: This rule checks only whether `autofocus` _exists_, not whether it is placed on the most appropriate element. For guidance on where to place initial focus, see the [WAI-ARIA APG: Modal Dialog Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/).

## See Also

- [Issue #689](https://github.com/markuplint/markuplint/issues/689)
- [HTML Living Standard: The dialog element](https://html.spec.whatwg.org/multipage/interactive-elements.html#the-dialog-element)
- [HTML Living Standard: Dialog focusing steps](https://html.spec.whatwg.org/multipage/interactive-elements.html#dialog-focusing-steps)
- [WAI-ARIA APG: Modal Dialog Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/)
- [Invoker Commands API Explainer](https://open-ui.org/components/invokers.explainer/)
- [MDN: autofocus](https://developer.mozilla.org/en-US/docs/Web/HTML/Global_attributes/autofocus)
