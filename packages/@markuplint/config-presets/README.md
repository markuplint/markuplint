# @markuplint/config-presets

[![npm version](https://badge.fury.io/js/%40markuplint%2Fconfig-presets.svg)](https://www.npmjs.com/package/@markuplint/config-presets)

## Usage

To the `extends` property of the configuration, specify like below:

```json
{
  "extends": ["markuplint:recommended"]
}
```

You can choose some presets appropriately for your preference.

```json
{
  "extends": ["markuplint:html-standard", "markuplint:a11y"]
}
```

## Ruleset Mapping

Ruleset|Description|`recommended`|`recommended-vue`|`recommended-svelte`|`recommended-static-html`|`recommended-react`|`a11y`|`code-styles`|`compat`|`html-standard`|`performance`|`rdfa`|`security`|
---|---|---|---|---|---|---|---|---|---|---|---|---|---|
[Must not duplicate **ID**](https://www.w3.org/WAI/WCAG21/Techniques/html/H93.html)|Be able to avoid problems in assistive technologies from the viewpoint of machine readability.|✅|✅|✅|✅|✅|✅|❌|❌|✅|❌|❌|❌|
[Disallow `accesskey` attr](https://developer.mozilla.org/en-US/docs/Web/HTML/Global_attributes/accesskey#accessibility_concerns)| |✅|✅|✅|✅|✅|✅|❌|❌|❌|❌|❌|❌|
`<label>` should have control| |✅|✅|✅|✅|✅|✅|❌|❌|❌|❌|❌|❌|
[Use **landmark**](https://www.w3.org/TR/wai-aria-practices/examples/landmarks/)| |✅|✅|✅|✅|✅|✅|❌|❌|❌|❌|❌|❌|
**Popover** trigger and target must be adjacent| |✅|✅|✅|✅|✅|✅|❌|❌|❌|❌|❌|❌|
[No ambiguous **Navigable Target Names**](https://html.spec.whatwg.org/multipage/document-sequences.html#navigable-target-names)| |✅|✅|✅|✅|✅|✅|❌|❌|❌|❌|❌|❌|
No consecutive `<br>`| |✅|✅|✅|✅|✅|✅|❌|❌|❌|❌|❌|❌|
No refer to no existent **ID**| |✅|✅|✅|✅|✅|✅|❌|❌|✅|❌|❌|❌|
No redundant **accessible name** sources| |✅|✅|✅|✅|✅|✅|❌|❌|❌|❌|❌|❌|
Require **accessible name**| |✅|✅|✅|✅|✅|✅|❌|❌|❌|❌|❌|❌|
Require **autofocus** in modal dialogs| |✅|✅|✅|✅|✅|✅|❌|❌|❌|❌|❌|❌|
Require `<h1>`| |✅|✅|✅|✅|✅|✅|❌|❌|❌|❌|❌|❌|
Align row and column| |✅|✅|✅|✅|✅|✅|❌|❌|❌|❌|❌|❌|
Use `<ul>`| |✅|✅|✅|✅|✅|✅|❌|❌|❌|❌|❌|❌|
Conform to **WAI-ARIA**| |✅|✅|✅|✅|✅|✅|❌|❌|❌|❌|❌|❌|
Require `<html lang>`| |✅|✅|✅|✅|✅|✅|❌|❌|❌|❌|❌|❌|
Require `<abbr title>`| |✅|✅|✅|✅|✅|✅|❌|❌|❌|❌|❌|❌|
Require `<track>` in media elements| |✅|✅|✅|✅|✅|✅|❌|❌|❌|❌|❌|❌|
Require `<video muted>` when autoplay is set| |✅|✅|✅|✅|✅|✅|❌|❌|❌|❌|❌|❌|
No merge cells| |✅|✅|✅|✅|✅|✅|❌|❌|❌|❌|❌|❌|
[`<summary>` must not contain interactive contents](https://github.com/whatwg/html/issues/2272#issuecomment-1242415594)|There is a case where an assistive technology can't access contents, or contents don't propagate a mouse event to `<summary>`.|✅|✅|✅|✅|✅|✅|❌|❌|❌|❌|❌|❌|
[Disallow `autofocus` attr outside dialog scope](https://developer.mozilla.org/en-US/docs/Web/HTML/Global_attributes/autofocus#accessibility_considerations)|Don't take away focus by force. The `dialog` element and its descendants are excepted.|✅|✅|✅|✅|✅|✅|❌|❌|❌|❌|❌|❌|
[`tabindex` attr only `-1` or `0`](https://developer.mozilla.org/en-US/docs/Web/HTML/Global_attributes/tabindex#accessibility_concerns)|Scoped to non-dialog elements because the HTML spec disallows `tabindex` on `<dialog>` (`noUse`).|✅|✅|✅|✅|✅|✅|❌|❌|❌|❌|❌|❌|
[Disallow `user-scalable=no` in viewport meta](https://developer.mozilla.org/en-US/docs/Web/HTML/Viewport_meta_tag)|Usage of `user-scalable=no` can cause accessibility issues to users with visual impairments such as low vision. WCAG requires a minimum of 2× scaling.|✅|✅|✅|✅|✅|✅|❌|❌|❌|❌|❌|❌|
[No duplicate attr](https://html.spec.whatwg.org/multipage/parsing.html#parse-error-duplicate-attribute)|The parser ignores all such duplicate occurrences of the attribute.|✅|✅|✅|✅|✅|❌|❌|❌|✅|❌|❌|❌|
No use deprecated attr|Authors must not use deprecated attributes from the viewpoint of compatibility.|✅|✅|✅|✅|✅|❌|❌|❌|✅|❌|❌|❌|
No use deprecated element|Authors must not use deprecated elements from the viewpoint of compatibility.|✅|✅|✅|✅|✅|❌|❌|❌|✅|❌|❌|❌|
[Require `doctype`](https://html.spec.whatwg.org/multipage/syntax.html#syntax-doctype)|It has the effect of avoiding quirks mode.|✅|✅|✅|✅|✅|❌|❌|❌|✅|❌|❌|❌|
Must not skip heading levels| |✅|✅|✅|✅|✅|❌|❌|❌|✅|❌|❌|❌|
[No duplicate autofocus](https://html.spec.whatwg.org/multipage/interaction.html#the-autofocus-attribute)| |✅|✅|✅|✅|✅|❌|❌|❌|✅|❌|❌|❌|
[No duplicate visible main](https://html.spec.whatwg.org/multipage/grouping-content.html#the-main-element)| |✅|✅|✅|✅|✅|❌|❌|❌|✅|❌|❌|❌|
[No duplicate charset](https://html.spec.whatwg.org/multipage/semantics.html#attr-meta-charset)| |✅|✅|✅|✅|✅|❌|❌|❌|✅|❌|❌|❌|
No use ineffective attr| |✅|✅|✅|✅|✅|❌|❌|❌|✅|❌|❌|❌|
[No duplicate names in `<dl>`](https://html.spec.whatwg.org/multipage/grouping-content.html#the-dl-element:~:text=Within%20a%20single%20dl%20element%2C%20there%20should%20not%20be%20more%20than%20one%20dt%20element%20for%20each%20name)|Within a single dl element, there should not be more than one dt element for each name.|✅|✅|✅|✅|✅|❌|❌|❌|✅|❌|❌|❌|
No use **orphaned end tag**| |✅|✅|✅|✅|✅|❌|❌|❌|✅|❌|❌|❌|
Allow only **permitted contents**| |✅|✅|✅|✅|✅|❌|❌|❌|✅|❌|❌|❌|
Need **placeholder label option**| |✅|✅|✅|✅|✅|❌|❌|❌|✅|❌|❌|❌|
Require the `datetime` attribute if the content of the `time` element is invalid| |✅|✅|✅|✅|✅|❌|❌|❌|✅|❌|❌|❌|
Specify required attr| |✅|✅|✅|✅|✅|❌|❌|❌|✅|❌|❌|❌|
[Enforce WHATWG constraints between `srcset`, `sizes`, and `loading` attributes](https://html.spec.whatwg.org/multipage/images.html#srcset-attributes)| |✅|✅|✅|✅|✅|❌|❌|❌|✅|❌|❌|❌|
[Validate link type keywords](https://html.spec.whatwg.org/multipage/links.html#linkTypes)|Validates that `rel` attribute keywords are allowed on the given element and context (e.g., body-ok for `<link>` inside `<body>`).|✅|✅|✅|✅|✅|❌|❌|❌|✅|❌|❌|❌|
[Specify `charset=UTF-8`](https://html.spec.whatwg.org/multipage/semantics.html#charset)| |✅|✅|✅|✅|✅|❌|❌|❌|✅|❌|❌|❌|
[No use `<small>` as **subheadings**](https://html.spec.whatwg.org/multipage/text-level-semantics.html#the-small-element)|The small element must not be used for subheadings.|✅|✅|✅|✅|✅|❌|❌|❌|✅|❌|❌|❌|
[No use `<caption>` within `<figure>`](https://html.spec.whatwg.org/multipage/tables.html#the-caption-element)|When `<table>` is the only content in `<figure>` other than `<figcaption>`, `<caption>` should be omitted in favor of `<figcaption>`.|✅|✅|✅|✅|✅|❌|❌|❌|✅|❌|❌|❌|
[Require `title` attr in `<input pattern>`](https://html.spec.whatwg.org/multipage/input.html#attr-input-pattern)|When an `<input>` element has a `pattern` attribute specified, authors should include a `title` attribute to give a description of the pattern.|✅|✅|✅|✅|✅|❌|❌|❌|✅|❌|❌|❌|
No nested same `<details>` name group|A document must not contain a details element that is a descendant of another details element in the same details name group.|✅|✅|✅|✅|✅|❌|❌|❌|✅|❌|❌|❌|
[No use `shortcut` keyword in `<link rel>`](https://html.spec.whatwg.org/multipage/links.html#rel-shortcut-icon)|For historical reasons, the icon keyword may be preceded by the keyword "shortcut". However, pages should not use the keyword "shortcut" as it is unnecessary.|✅|✅|✅|✅|✅|❌|❌|❌|✅|❌|❌|❌|
[Require `charset=UTF-8`](https://html.spec.whatwg.org/multipage/semantics.html#charset)| |✅|✅|✅|✅|✅|❌|❌|❌|❌|✅|❌|❌|
Require `defer` attr|Should load and parse scripts lazily to avoid render-blocking.|✅|✅|✅|✅|✅|❌|❌|❌|❌|✅|❌|❌|
Require **aspect-ratio**|Require `width` and `height` attr with `<img>` to avoid **Cumulative Layout Shift**|✅|✅|✅|✅|✅|❌|❌|❌|❌|✅|❌|❌|
Require loading `<iframe>` lazily|Require `loading=lazy` with `<iframe>` to avoid render-blocking that causes loading if its element is out of the viewport.|✅|✅|✅|✅|✅|❌|❌|❌|❌|✅|❌|❌|
Allow `property` attr with `<meta>`|Be able to use **Open-Graph** etc.|✅|✅|✅|✅|✅|❌|❌|❌|❌|❌|✅|❌|
No hard coding **ID**|The component that hard-coded ID cannot mount to an app duplicated because the IDs must be unique in a document. Recommend to specify dynamic IDs to avoid doing that.|❌|✅|✅|❌|✅|❌|❌|❌|❌|❌|❌|❌|
Use [**character reference**](https://markuplint.dev/docs/rules/character-reference)|Warns when illegal characters in text nodes or attribute values are not escaped with character references.|❌|❌|❌|✅|❌|❌|❌|❌|❌|❌|❌|❌|
No omit **end-tag**|Recommend to write an end-tag always because it is too difficult for a human decide an element is end-tag omittable.|❌|❌|❌|✅|❌|❌|❌|❌|❌|❌|❌|❌|

## Install

[`markuplint`](https://www.npmjs.com/package/markuplint) package includes this package.

<details>
<summary>If you are installing purposely, how below:</summary>

```shell
$ npm install @markuplint/config-presets

$ yarn add @markuplint/config-presets
```

</details>
