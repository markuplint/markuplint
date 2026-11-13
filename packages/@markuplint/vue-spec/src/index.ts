/**
 * @module @markuplint/vue-spec
 *
 * Provides Vue-specific extended specifications for markuplint.
 * Defines Vue's special global attributes (`key` for list rendering
 * and `ref` for template refs) and element-level overrides such as
 * allowing dynamic properties on the `<slot>` element.
 *
 * It only exports a static data object, which is verified through the type
 * check at build time and `@markuplint/vue-parser`'s integration tests. The
 * one exception is the key that `directivePatterns` give to the repeat of a
 * directive: it is a pure function of the patterns, so `index.spec.ts` pins it
 * where the patterns are.
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
		/**
		 * Dynamic attribute/event names with brackets (e.g., :[dynamicAttr], @[dynamicEvent], .[dynamicProp]).
		 * It comes first: Vue never drops a dynamic key (`dedupeProperties` keeps every one), so the key of
		 * the name that it makes is not the key of a repeat, and only the same spelling is (the parser reports it).
		 *
		 * @see https://github.com/vuejs/core/blob/main/packages/compiler-core/src/transforms/transformElement.ts#dedupeProperties
		 */
		{
			pattern: '^(?:v-bind:|:|v-on:|@|\\.)\\[',
			isDirective: true,
			isDynamicValue: true,
		},
		/**
		 * .propName shorthand (Vue 3.2+, equivalent to v-bind:propName.prop).
		 *
		 * The key that Vue keeps of a `v-bind` with a static argument is the argument as `transformBind` makes it:
		 * camelized by `.camel`, then `.` in front of it by `.prop` and `^` by `.attr`. Vue keeps the first of two
		 * with the same key and drops the others without an error (`dedupeProperties` merges only `class`, `style`
		 * and the listeners), so a repeat is by that key: the order of the modifiers and a modifier that Vue
		 * does not know make no difference, and `:id.prop` is not `:id`.
		 *
		 * @see https://github.com/vuejs/core/blob/main/packages/compiler-core/src/transforms/vBind.ts#transformBind
		 * @see https://github.com/vuejs/core/blob/main/packages/compiler-core/src/transforms/transformElement.ts#dedupeProperties
		 */
		{
			pattern: '^\\.([^.]+)((?:\\.[^.]*)*)$',
			isDirective: true,
			isDynamicValue: true,
			duplicateKey: '.$1',
			duplicateKeyModifiers: {
				group: 2,
				camelize: ['camel'],
				prefixes: [{ modifier: 'attr', prefix: '^' }],
			},
		},
		/**
		 * `:class` and `:style` with modifiers that are neither `.prop` nor `.attr` make the key `class` or
		 * `style`, which Vue merges with the others of the same key instead of dropping (`dedupeProperties`), as
		 * it does `:class` and `class`. So they are not a repeat of one another, and only the same spelling is (the
		 * parser reports it): the key is the name as it is written.
		 *
		 * @see https://github.com/vuejs/core/blob/main/packages/compiler-core/src/transforms/transformElement.ts#dedupeProperties
		 */
		{
			pattern: '^(?:v-bind:|:)(?:class|style)(?:\\.(?!(?:prop|attr)(?:\\.|$))[^.]*)+$',
			isDirective: true,
			isDynamicValue: true,
		},
		// v-bind/: with a modifier (.prop, .camel, .attr) → isDirective. Keyed as the shorthand above.
		{
			pattern: '^(?:v-bind:|:)([^.]+)((?:\\.[^.]*)+)$',
			isDirective: true,
			isDynamicValue: true,
			duplicateKey: '$1',
			duplicateKeyModifiers: {
				group: 2,
				camelize: ['camel'],
				prefixes: [
					{ modifier: 'attr', prefix: '^' },
					{ modifier: 'prop', prefix: '.' },
				],
				// Without `.prop` and `.attr` it binds the attribute of that name (`.camel` or a modifier that
				// Vue does not know), which is a repeat of `:name` as the element folds it
				foldedWithoutPrefix: true,
			},
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
			// so these attributes may legitimately appear alongside `:class`/`:style`. It is not that a
			// bound one may be written twice: `:class` twice is a name written the same, which the
			// parser reports, so it is keyed by the name as it is written (`MLAttr#duplicateKey`).
			isDuplicatable: ['class', 'style'],
		},
		/**
		 * v-on:event or @event (with optional modifiers).
		 *
		 * It is keyed by the name as it is written, not by `potentialName` (`on$1` is the same for every
		 * modifier): the parser reports only a name written the same, modifiers included, and the
		 * listeners of the same key are merged into one array, which is why `@keydown.enter` and
		 * `@keydown.space`, or `@click` and `v-on:click`, are not a repeat. Two listeners are two
		 * attributes of the DOM only when the case of the name differs (`@KEYDOWN` is `on:KEYDOWN`).
		 *
		 * @see https://github.com/vuejs/core/blob/main/packages/compiler-core/src/parser.ts#tokenizer
		 * @see https://github.com/vuejs/core/blob/main/packages/compiler-core/src/transforms/transformElement.ts#dedupeProperties
		 * @see https://github.com/vuejs/core/blob/main/packages/compiler-core/src/transforms/vOn.ts#transformOn
		 */
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
	 *
	 * `@markuplint/vue-parser` declares the same value (`MLParser#templateContent`), so that a file
	 * is read right without this spec in the configuration. Change both together.
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
