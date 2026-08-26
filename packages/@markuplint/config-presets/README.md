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
[Use **landmark**](https://www.w3.org/WAI/ARIA/apg/practices/landmark-regions/)|Split from the former `landmark-roles` rule (#3989); this group keeps its name and wraps only this one rule. The duplicated-landmark-labeling half lives in the new `a11y/require-landmark-label` sibling group below.|✅|✅|✅|✅|✅|✅|❌|❌|❌|❌|❌|❌|
[Require a unique label for duplicated landmarks](https://www.w3.org/WAI/ARIA/apg/practices/landmark-regions/)|Split from the former `landmark-roles` rule (#3989).|✅|✅|✅|✅|✅|✅|❌|❌|❌|❌|❌|❌|
**Popover** trigger and target must be adjacent| |✅|✅|✅|✅|✅|✅|❌|❌|❌|❌|❌|❌|
[No ambiguous **Navigable Target Names**](https://html.spec.whatwg.org/multipage/document-sequences.html#navigable-target-names)| |✅|✅|✅|✅|✅|✅|❌|❌|❌|❌|❌|❌|
No consecutive `<br>`| |✅|✅|✅|✅|✅|✅|❌|❌|❌|❌|❌|❌|
No refer to no existent **ID**| |✅|✅|✅|✅|✅|✅|❌|❌|✅|❌|❌|❌|
No broken fragment link|Split from the former `no-refer-to-non-existent-id` rule (#3989). Because `no-refer-to-non-existent-id` itself isn't renamed or deprecated, it gets no `rule-aliases.ts` entry — a hand-written config that enables only `no-refer-to-non-existent-id` keeps working unchanged but silently loses fragment link coverage. This group is how a11y-preset users keep it.|✅|✅|✅|✅|✅|✅|❌|❌|❌|❌|❌|❌|
No redundant **accessible name** sources| |✅|✅|✅|✅|✅|✅|❌|❌|❌|❌|❌|❌|
Require **accessible name**| |✅|✅|✅|✅|✅|✅|❌|❌|❌|❌|❌|❌|
Require **autofocus** in modal dialogs| |✅|✅|✅|✅|✅|✅|❌|❌|❌|❌|❌|❌|
Require `<h1>`| |✅|✅|✅|✅|✅|✅|❌|❌|❌|❌|❌|❌|
Align row and column|Split from the former `table-row-column-alignment` rule (#3989). This group keeps its name for anyone overriding it directly; the three table-model-error checks that split out alongside it (`no-table-cell-overlap`, `no-table-span-overflow`, `no-empty-table-track`) live in their own sibling groups below since their default severity, `error`, differs from this group's `warning`.|✅|✅|✅|✅|✅|✅|❌|❌|❌|❌|❌|❌|
[No overlapping table cells](https://html.spec.whatwg.org/multipage/tables.html#forming-a-table)| |✅|✅|✅|✅|✅|✅|❌|❌|❌|❌|❌|❌|
[No table cell span reaching past its row group](https://html.spec.whatwg.org/multipage/tables.html#forming-a-table)| |✅|✅|✅|✅|✅|✅|❌|❌|❌|❌|❌|❌|
[No table row or column with no cell anchored to it](https://html.spec.whatwg.org/multipage/tables.html#forming-a-table)| |✅|✅|✅|✅|✅|✅|❌|❌|❌|❌|❌|❌|
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
No obsolete attr|Authors must not use attributes the spec has removed entirely. The group name is kept as `deprecated-attr` for backward compatibility.|✅|✅|✅|✅|✅|❌|❌|❌|✅|❌|❌|❌|
No deprecated attr|MDN/BCD-sourced (factual, not a spec MUST) — kept enabled here (severity downgraded to warning, not removed from the preset) so existing markuplint:html-standard users keep this coverage.|✅|✅|✅|✅|✅|❌|❌|❌|✅|❌|❌|❌|
No obsolete element|Authors must not use elements the spec has removed entirely. The group name is kept as `deprecated-element` for backward compatibility.|✅|✅|✅|✅|✅|❌|❌|❌|✅|❌|❌|❌|
No deprecated element|MDN/BCD-sourced (factual, not a spec MUST) — kept enabled here (severity downgraded to warning, not removed from the preset) so existing markuplint:html-standard users keep this coverage.|✅|✅|✅|✅|✅|❌|❌|❌|✅|❌|❌|❌|
[Require `doctype`](https://html.spec.whatwg.org/multipage/syntax.html#syntax-doctype)|It has the effect of avoiding quirks mode. The group name is kept as `doctype` for backward compatibility.|✅|✅|✅|✅|✅|❌|❌|❌|✅|❌|❌|❌|
[No obsolete doctype](https://html.spec.whatwg.org/multipage/syntax.html#the-doctype)|Authors must not use an obsolete DOCTYPE (a public identifier, or a system identifier other than the one legacy-string exception the spec still permits).|✅|✅|✅|✅|✅|❌|❌|❌|✅|❌|❌|❌|
Must not skip heading levels| |✅|✅|✅|✅|✅|❌|❌|❌|✅|❌|❌|❌|
[No duplicate autofocus](https://html.spec.whatwg.org/multipage/interaction.html#the-autofocus-attribute)|There must not be two elements with the autofocus attribute specified in the same document.|✅|✅|✅|✅|✅|❌|❌|❌|✅|❌|❌|❌|
[No duplicate visible main](https://html.spec.whatwg.org/multipage/grouping-content.html#the-main-element)|There must not be more than one visible main element in a document.|✅|✅|✅|✅|✅|❌|❌|❌|✅|❌|❌|❌|
No use ineffective attr| |✅|✅|✅|✅|✅|❌|❌|❌|✅|❌|❌|❌|
[No invalid attr](https://html.spec.whatwg.org/multipage/dom.html#attributes)|Each element's attribute names and values must conform to the HTML specification.|✅|✅|✅|✅|✅|❌|❌|❌|✅|❌|❌|❌|
[No duplicate names in `<dl>`](https://html.spec.whatwg.org/multipage/grouping-content.html#the-dl-element:~:text=Within%20a%20single%20dl%20element%2C%20there%20should%20not%20be%20more%20than%20one%20dt%20element%20for%20each%20name)|Within a single dl element, there should not be more than one dt element for each name.|✅|✅|✅|✅|✅|❌|❌|❌|✅|❌|❌|❌|
No use **orphaned end tag**| |✅|✅|✅|✅|✅|❌|❌|❌|✅|❌|❌|❌|
No **stray head or body tag**| |✅|✅|✅|✅|✅|❌|❌|❌|✅|❌|❌|❌|
No **content after body**| |✅|✅|✅|✅|✅|❌|❌|❌|✅|❌|❌|❌|
No **unclosed element at EOF**| |✅|✅|✅|✅|✅|❌|❌|❌|✅|❌|❌|❌|
**Meta charset** position within the first 1024 bytes| |✅|✅|✅|✅|✅|❌|❌|❌|✅|❌|❌|❌|
Allow only **permitted contents**| |✅|✅|✅|✅|✅|❌|❌|❌|✅|❌|❌|❌|
No disallowed ancestor|An element must not appear as a descendant of an ancestor its content model forbids (e.g. `<address>` inside `<address>`). Split off from `permitted-contents` — kept as its own named group here so preset users keep this coverage.|✅|✅|✅|✅|✅|❌|❌|❌|✅|❌|❌|❌|
Require ancestor|An element must appear as a descendant of a required ancestor (e.g. `<area>` outside `<map>`). Split off from `permitted-contents` — kept as its own named group here so preset users keep this coverage.|✅|✅|✅|✅|✅|❌|❌|❌|✅|❌|❌|❌|
No duplicate sibling attr|An attribute the content model marks as sibling-unique must not appear on more than one element of the same type within the same parent (e.g. multiple `<track default>`). Split off from `permitted-contents` — kept as its own named group here so preset users keep this coverage.|✅|✅|✅|✅|✅|❌|❌|❌|✅|❌|❌|❌|
Need **placeholder label option**| |✅|✅|✅|✅|✅|❌|❌|❌|✅|❌|❌|❌|
Require the `datetime` attribute if the content of the `time` element is invalid| |✅|✅|✅|✅|✅|❌|❌|❌|✅|❌|❌|❌|
Specify required attr| |✅|✅|✅|✅|✅|❌|❌|❌|✅|❌|❌|❌|
[Validate `<script type="importmap">` body against the import map spec](https://html.spec.whatwg.org/multipage/webappapis.html#parse-an-import-map-string)|Split from the former `script-content` rule (#3989). This group keeps its name — and wraps only this one rule, so a group with 2+ rules doesn't get its virtual rule name suffixed with the base rule name — for anyone overriding it directly. `valid-speculation-rules` lives in its own sibling group below for the same reason.|✅|✅|✅|✅|✅|❌|❌|❌|✅|❌|❌|❌|
[Validate `<script type="speculationrules">` body against the Speculation Rules spec](https://html.spec.whatwg.org/multipage/speculative-loading.html)| |✅|✅|✅|✅|✅|❌|❌|❌|✅|❌|❌|❌|
[Require `sizes` wherever `srcset` uses width descriptors, and vice versa](https://html.spec.whatwg.org/multipage/images.html#srcset-attributes)|Split from the former `srcset-sizes-constraint` rule (#3989). This group keeps its name — and wraps only this one rule, so a group with 2+ rules doesn't get its virtual rule name suffixed with the base rule name — for anyone overriding it directly. The other three checks live in their own sibling groups below for the same reason.|✅|✅|✅|✅|✅|❌|❌|❌|✅|❌|❌|❌|
[Disallow mixing width and pixel density descriptors in `srcset`](https://html.spec.whatwg.org/multipage/images.html#srcset-attributes)| |✅|✅|✅|✅|✅|❌|❌|❌|✅|❌|❌|❌|
[Require `loading="lazy"` wherever `sizes="auto"` is used](https://html.spec.whatwg.org/multipage/embedded-content.html#the-img-element)| |✅|✅|✅|✅|✅|❌|❌|❌|✅|❌|❌|❌|
[Require a distinguishing `media` or `type` on a `<source>` with a following srcset-bearing sibling](https://html.spec.whatwg.org/multipage/embedded-content.html#the-source-element)| |✅|✅|✅|✅|✅|❌|❌|❌|✅|❌|❌|❌|
[Validate link type keywords](https://html.spec.whatwg.org/multipage/links.html#linkTypes)|Validates that `rel` attribute keywords are allowed on the given element and context (e.g., body-ok for `<link>` inside `<body>`).|✅|✅|✅|✅|✅|❌|❌|❌|✅|❌|❌|❌|
[Form-associated `form` attribute must reference a form element](https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#attr-fae-form)| |✅|✅|✅|✅|✅|❌|❌|❌|✅|❌|❌|❌|
[`<input type="button">` with empty `value`](https://html.spec.whatwg.org/multipage/input.html#button-state-(type=button))|Mirrors nu-validator's hardcoded assertion. HTML LS itself does not state this verbatim; see the rule's README for the precise sourcing.|✅|✅|✅|✅|✅|❌|❌|❌|✅|❌|❌|❌|
[`<input type="file">` value must be empty when specified](https://html.spec.whatwg.org/multipage/input.html#file-upload-state-(type=file))| |✅|✅|✅|✅|✅|❌|❌|❌|✅|❌|❌|❌|
[`<input list>` must reference a `<datalist>` element by ID](https://html.spec.whatwg.org/multipage/input.html#the-list-attribute)| |✅|✅|✅|✅|✅|❌|❌|❌|✅|❌|❌|❌|
[`<label for>` must reference a labelable element by ID](https://html.spec.whatwg.org/multipage/forms.html#attr-label-for)| |✅|✅|✅|✅|✅|❌|❌|❌|✅|❌|❌|❌|
[`<label>` descendant-control constraints (at most one form-control descendant; none when `for` targets an external labelable element)](https://html.spec.whatwg.org/multipage/forms.html#the-label-element)| |✅|✅|✅|✅|✅|❌|❌|❌|✅|❌|❌|❌|
[`<map>` `id` must equal `name` when both are specified](https://html.spec.whatwg.org/multipage/image-maps.html#the-map-element)| |✅|✅|✅|✅|✅|❌|❌|❌|✅|❌|❌|❌|
[`<img usemap>` must be a valid hash-name reference to a `<map>` element](https://html.spec.whatwg.org/multipage/image-maps.html#attr-hyperlink-usemap)| |✅|✅|✅|✅|✅|❌|❌|❌|✅|❌|❌|❌|
[`<meter>` attribute inequalities (min ≤ value ≤ max etc.)](https://html.spec.whatwg.org/multipage/form-elements.html#the-meter-element)| |✅|✅|✅|✅|✅|❌|❌|❌|✅|❌|❌|❌|
[`<progress>` attribute inequalities (value ≤ max; value ≤ 1 when max is absent)](https://html.spec.whatwg.org/multipage/form-elements.html#the-progress-element)| |✅|✅|✅|✅|✅|❌|❌|❌|✅|❌|❌|❌|
[Single `<select>` allows at most one selected `<option>`](https://html.spec.whatwg.org/multipage/form-elements.html#the-select-element)| |✅|✅|✅|✅|✅|❌|❌|❌|✅|❌|❌|❌|
[Specify `charset=UTF-8`](https://html.spec.whatwg.org/multipage/semantics.html#charset)| |✅|✅|✅|✅|✅|❌|❌|❌|✅|❌|❌|❌|
[No duplicate meta charset](https://html.spec.whatwg.org/multipage/semantics.html#attr-meta-charset)|There must not be more than one meta element with a charset attribute per document.|✅|✅|✅|✅|✅|❌|❌|❌|✅|❌|❌|❌|
[No duplicate meta description](https://html.spec.whatwg.org/multipage/semantics.html#standard-metadata-names)|There must not be more than one meta element where the name attribute value is an ASCII case-insensitive match for "description" per document.|✅|✅|✅|✅|✅|❌|❌|❌|✅|❌|❌|❌|
[No coexistence of meta charset and meta http-equiv content-type](https://html.spec.whatwg.org/multipage/semantics.html#attr-meta-charset)|A document must not contain both a meta element with an http-equiv attribute in the Encoding declaration state and a meta element with the charset attribute.|✅|✅|✅|✅|✅|❌|❌|❌|✅|❌|❌|❌|
[`<base>` must precede `<link>` and `<script>`](https://html.spec.whatwg.org/multipage/semantics.html#the-base-element)|A base element must come before any other elements in the tree that have attributes defined as taking URLs, except the html element. In `<head>`, the URL-taking elements are `<link>` (href, imagesrcset) and `<script>` (src); a `<base>` that follows either shadows its own effect on those references.|✅|✅|✅|✅|✅|❌|❌|❌|✅|❌|❌|❌|
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
Use [**no-unescaped-char**](https://markuplint.dev/docs/rules/no-unescaped-char)|Warns when a literal `<` (the one character HTML LS always prohibits unescaped) appears in a text node or attribute value. The group name is kept as `character-reference` for backward compatibility.|❌|❌|❌|✅|❌|❌|❌|❌|❌|❌|❌|❌|
Use [**no-malformed-character-reference**](https://markuplint.dev/docs/rules/no-malformed-character-reference)|Warns when a `&...;`-shaped character reference is malformed (unknown name, missing semicolon, or a NULL/surrogate/control/ noncharacter/out-of-range numeric reference).|❌|❌|❌|✅|❌|❌|❌|❌|❌|❌|❌|❌|
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
