/**
 * @module @markuplint/vue-spec
 *
 * Provides Vue-specific extended specifications for markuplint.
 * Defines Vue's special global attributes (`key` for list rendering
 * and `ref` for template refs) and element-level overrides such as
 * allowing dynamic properties on the `<slot>` element.
 *
 * This package has no dedicated test files because it only exports
 * a static data object; it is verified through the type check at
 * build time and `@markuplint/vue-parser`'s integration tests.
 */

import type { ExtendedSpec } from '@markuplint/ml-spec';

/**
 * The Vue framework extended specification.
 *
 * Registers Vue-specific global attributes and element specs.
 * The `key` attribute is conditionally available on elements that
 * use the `v-for` directive, while `ref` is universally available
 * for accessing component instances and DOM elements. The `<slot>`
 * element is marked as allowing additional dynamic properties.
 */
const spec: ExtendedSpec = {
	// Patterns are evaluated in order and resolution is first-match-wins
	// (see `resolveDirective` in @markuplint/ml-spec), so any new pattern
	// must be inserted before the generic `^v-` catch-all at the end.
	directivePatterns: [
		// .propName shorthand (Vue 3.2+, equivalent to v-bind:propName.prop)
		{
			pattern: '^\\.(.+)$',
			isDirective: true,
			isDynamicValue: true,
		},
		// v-bind/: with .prop or .camel modifier → isDirective
		{
			pattern: '^(?:v-bind:|:)([^.]+)\\..+$',
			isDirective: true,
			isDynamicValue: true,
		},
		// Dynamic attribute/event names with brackets (e.g., :[dynamicAttr], @[dynamicEvent])
		{
			pattern: '^(?:v-bind:|:|v-on:|@)\\[',
			isDirective: true,
			isDynamicValue: true,
		},
		// v-bind:attr or :attr (no modifier) → potentialName=attr, isDynamicValue
		{
			pattern: '^(?:v-bind:|:)([^.]+)$',
			potentialName: '$1',
			isDynamicValue: true,
			// The value is a JavaScript expression that becomes the attribute value, so a literal in it
			// is rendered as Vue renders it (`literalValues` below). The same-name shorthand `:attr`
			// has no value, which `MLAttr` does not read as a literal.
			expressionLanguage: 'javascript',
			// Vue merges static `class`/`style` with their bound equivalents,
			// so these attributes may legitimately appear alongside `:class`/`:style`
			isDuplicatable: ['class', 'style'],
		},
		// v-on:event or @event (with optional modifiers)
		{
			pattern: '^(?:v-on:|@)([^.]+)(?:\\..+)?$',
			potentialName: 'on$1',
			isDirective: true,
			isDynamicValue: true,
		},
		// v-model (with optional modifiers)
		{
			pattern: '^v-model(?:$|\\.)',
			isDirective: true,
			isDynamicValue: true,
		},
		// v-slot:name or #name shorthand
		{
			pattern: '^(?:v-slot:|#)',
			isDirective: true,
			isDynamicValue: true,
		},
		// Other v-* directives (v-show, v-if, v-for, v-text, v-html, etc.)
		{
			pattern: '^v-',
			isDirective: true,
			isDynamicValue: true,
		},
	],
	/**
	 * Only a `template` with `v-if`, `v-else-if`, `v-else`, `v-for` or `v-slot` is a fragment of Vue
	 * (`isFragmentTemplate` of `@vue/compiler-core`). Any other one is an element, which the client
	 * creates and appends each child to (`insert` of `nodeOps` in `@vue/runtime-dom` calls
	 * `parent.insertBefore`), so the children are in the tree of the document, not in `content`.
	 * Known limitations: Vue puts the children in `content` when it renders static markup as a
	 * string, and when it hydrates server output it replaces the element with its content.
	 */
	templateContent: 'in-place',
	/**
	 * How Vue renders a literal in `:attr="…"` (`ssrRenderDynamicAttr` of `@vue/server-renderer`), where it
	 * differs from the default of `@markuplint/ml-core`. The docs of Vue say of a boolean attribute:
	 *
	 * > It will also be included if the value is an empty string, maintaining consistency with `<button disabled="">`.
	 *
	 * So the table says:
	 *
	 * - A boolean attribute (`isBooleanAttr` of `@vue/shared`) is present for any truthy value and for the
	 *   empty string (`includeBooleanAttr`)
	 * - `class` and `style` are always output, and a value that is not a string, an array or an object
	 *   is `""` (`ssrRenderClass`, `ssrRenderStyle`)
	 *
	 * What it does not tell, which is not expressed by a table (the rendering does not affect a rule, or
	 * the markup is invalid and `invalid-attr` reports it):
	 *
	 * - `:value` of `<input>` and `<option>` sets the DOM property, not the attribute (`textarea` is not
	 *   output by the server): a literal in it is rendered as the default does
	 * - `key` and `ref` are not output by the server, as they are not attributes of the DOM, but a static
	 *   `key="x"` is seen as an attribute too
	 * - The client renders `:disabled="false"` on an element that has no boolean attribute `disabled` as
	 *   `disabled="false"`; the server does not output it, and the table follows the server
	 * - A number other than `0` on `class` and `style` is `""` too, which a table cannot list: it is `"1"` here
	 *
	 * @see https://vuejs.org/guide/essentials/template-syntax.html#boolean-attributes
	 * @see https://github.com/vuejs/core/blob/main/packages/server-renderer/src/helpers/ssrRenderAttrs.ts#ssrRenderDynamicAttr
	 * @see https://github.com/vuejs/core/blob/main/packages/shared/src/domAttrConfig.ts#isBooleanAttr
	 * @see https://github.com/vuejs/core/blob/main/packages/shared/src/domAttrConfig.ts#includeBooleanAttr
	 */
	literalValues: {
		booleanAttrs: { '""': '' },
		attrs: {
			class: { true: '', false: '', null: '', undefined: '', '0': '' },
			style: { true: '', false: '', null: '', undefined: '', '0': '' },
		},
	},
	def: {
		'#globalAttrs': {
			'#extends': {
				key: {
					type: 'NoEmptyAny',
					description: 'A special attribute for list rendering',
					condition: '[v-for]',
				},
				ref: {
					type: 'NoEmptyAny',
					description: 'A special attribute for accessing child component instances and child elements',
				},
			},
		},
	},
	specs: [
		{
			// Scoped slot APIs pass arbitrary props through `<slot>`,
			// so any property must be allowed on it
			name: 'slot',
			possibleToAddProperties: true,
		},
	],
};

export default spec;
