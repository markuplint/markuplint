/**
 * @module @markuplint/vue-spec
 *
 * Provides Vue-specific extended specifications for markuplint.
 * Defines Vue's special global attributes (`key` for list rendering
 * and `ref` for template refs) and element-level overrides such as
 * allowing dynamic properties on the `<slot>` element.
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
			name: 'slot',
			possibleToAddProperties: true,
		},
	],
};

export default spec;
