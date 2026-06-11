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
			// Vue merges static `class`/`style` with their bound equivalents,
			// so these attributes may legitimately appear alongside `:class`/`:style`
			isDuplicatable: ['class', 'style'],
		},
		// v-on:event or @event (with optional modifiers)
		{
			pattern: '^(?:v-on:|@)([^.]+)(?:\\..+)?$',
			potentialName: 'on$1',
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
