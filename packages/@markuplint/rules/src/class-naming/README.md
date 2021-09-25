---
title: Class naming convention
id: class-naming
category: naming-convention
---

# Class naming convention

Warn if the class name does not conform to the specified rules.

## Rule Details

👎 Examples of **incorrect** code for this rule

`{ "class-naming": "/[a-z]+(?:__[a-z]+(?:--[a-z]+))?/" }`

```html
<div class="Block"></div>
```

👍 Examples of **correct** code for this rule

`{ "class-naming": "/[a-z]+(?:__[a-z]+(?:--[a-z]+))?/" }`

```html
<div class="block"></div>
```

### Setting value

-   Type: `string | string[]`
-   Required
-   Default value: none

Sets a string that represents a regular expression or its array. Regular expressions are interpreted as regular expressions by enclosing them in `/`. It is possible to add a flag like `/.*/ ig` (regular expressions can only be interpreted by JavaScript)

### Default severity

`warning`

## Configuration Example

The BEM-like CSS structure:

```jsonc
{
	"rules": {
		// Enable class-naming rule to childNodeRules.
		"class-naming": "/.+/"
	},
	"childNodeRules": [
		{
			"regexSelector": {
				// Filter attributes to the class attribute.
				"attrName": "class",
				// Set the pattern of the class
				// and capture its own block name.
				// Enable capturing in either the number and group name.
				// In the bellow, it is captured as `BlockName`.
				"attrValue": "/^(?<BlockName>[A-Z][a-z0-9]+)(?:__[a-z][a-z0-9-]+)?$/"
			},
			"rules": {
				"class-naming": {
					"value": [
						// Allow the element that is owned by the block.
						// `{{BlockName}}` will be expand from the captured group.
						"/^{{BlockName}}__[a-z][a-z0-9-]+$/",
						// Allow another block.
						"/^([A-Z][a-z0-9]+)$/"
					]
				}
			}
		}
	]
}
```

```html
<section class="Card">
	<div class="Card__header">
		<div class="Heading"><h3 class="Heading__lv3">Title</h3></div>
	</div>
	<div class="Card__body">
		<div class="List">
			<ul class="List__group">
				<li>...</li>
				<li>...</li>
				<li>...</li>
			</ul>
		</div>
	</div>
</section>

<section class="Card">
	<div class="Card__header">
		<!-- 👎 It is "Card" scope, Don't use the element owned "Heading" -->
		<h3 class="Heading__lv3">Title</h3>
	</div>
	<div class="Card__body">
		<div class="Card__body-el">...</div>
		<!-- 👎 It is "Card" scope, Don't use the element owned "List" -->
		<ul class="List__group">
			<li>...</li>
			<li>...</li>
			<li>...</li>
		</ul>
		<div class="List">
			<!-- 👎 It is not "Card" scope instead of "List" scope here -->
			<ul class="Card__list">
				<li>...</li>
				<li>...</li>
				<li>...</li>
			</ul>
		</div>
	</div>
</section>
```
