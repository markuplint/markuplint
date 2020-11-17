---
title: WAI-ARIA
id: wai-aria
category: a11y
---

# WAI-ARIA

Warn if the `role` attribute and/or `aria-*` attributes don't set in accordance with specs that are WAI-ARIA and/or "ARIA in HTML".

Warn if:

-   Use the role that doesn't exist in the spec.
-   Use the abstract role.
-   Use the `aria-*` attribute that doesn't belong to a set role (or an abstract role).
-   Use a bad value of the `aria-*` attribute.
-   Use the not permitted role according to ARIA in HTML.
-   Set the implicit role explicitly.

There are settings about **ARIA in HTML** on [`@markuplint/html-spec`](https://github.com/markuplint/markuplint/tree/master/packages/%40markuplint/html-spec/src/aria-in-html). And you can disable them because that is draft yet.

## Rule Details

👎 Examples of **incorrect** code for this rule

```html
<div role="landmark" aria-busy="busy">
	<ul>
		<li role="button">an item</li>
	</ul>
	<button aria-checked="true">Click me!</button>
</div>
```

👍 Examples of **correct** code for this rule

```html
<div role="banner" aria-busy="true">
	<ul>
		<li role="menuitemcheckbox">an item</li>
	</ul>
	<button aria-pressed="true">Click me!</button>
</div>
```

### Setting value

Type: `boolean`

### Options

#### `checkingValue`

Warn if use a bad value of the `aria-*` attribute.

-   Type: `boolean`
-   Optional
-   Default: `true`

##### `permittedAriaRoles`

Warn if use the not permitted role according to ARIA in HTML.

-   Type: `boolean`
-   Optional
-   Default: `true`

##### `disallowSetImplicitRole`

Disallow set the implicit role explicitly.

-   Type: `boolean`
-   Optional
-   Default: `true`

### Default notification severity

`error`
