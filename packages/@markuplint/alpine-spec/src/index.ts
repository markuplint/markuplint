/**
 * @module @markuplint/alpine-spec
 *
 * Provides Alpine.js-specific extended specifications for markuplint.
 * Defines Alpine.js directives (`x-data`, `x-show`, `x-bind`, `x-on`,
 * `x-model`, `x-text`, `x-html`, `x-ref`, `x-if`, `x-for`,
 * `x-transition`, `x-effect`, `x-ignore`, `x-cloak`, etc.)
 * as global attributes available on any HTML element.
 *
 * Alpine.js is a lightweight JavaScript framework that provides
 * reactive and declarative features directly in HTML markup.
 *
 * This package is merged into the base HTML spec by `schemaToSpec`
 * in `@markuplint/ml-spec`. It intentionally has no test suite:
 * conformance is enforced at build time by the `ExtendedSpec` type,
 * and the merged spec is exercised by the downstream
 * `@markuplint/ml-spec` and `@markuplint/ml-core` tests.
 *
 * @see https://alpinejs.dev/
 */

import type { ExtendedSpec } from '@markuplint/ml-spec';

/**
 * The Alpine.js framework extended specification.
 *
 * Registers global Alpine.js directives available on every HTML element.
 * Alpine.js directives are all global and prefixed with `x-`.
 */
const spec: ExtendedSpec = {
	cites: ['https://alpinejs.dev/'],
	directivePatterns: [
		/**
		 * Static directives: x-data, x-init, x-show, x-text, x-html,
		 * x-modelable, x-effect, x-ref, x-id, x-for, x-if, x-teleport
		 */
		{
			pattern: '^x-(?:data|init|show|text|html|modelable|effect|ref|id|for|if|teleport)$',
			isDirective: true,
		},
		/**
		 * Boolean directives: x-ignore, x-cloak
		 */
		{
			pattern: '^x-(?:ignore|cloak)$',
			isDirective: true,
			valueType: 'boolean',
		},
		/**
		 * x-model with optional modifiers (.lazy, .number, .debounce, etc.)
		 * @see https://alpinejs.dev/directives/model
		 */
		{
			pattern: '^x-model(?:$|\\.)',
			isDirective: true,
			isDynamicValue: true,
		},
		/**
		 * x-bind:attr or :attr shorthand => potentialName = attr
		 * @see https://alpinejs.dev/directives/bind
		 */
		{
			pattern: '^(?:x-bind:|:)([^.]+)(?:\\.[^.]+)?$',
			potentialName: '$1',
			isDynamicValue: true,
			valueType: 'code',
			isDuplicatable: ['class', 'style'],
		},
		/**
		 * x-on:event or @event shorthand => potentialName = onevent
		 * @see https://alpinejs.dev/directives/on
		 */
		{
			pattern: '^(?:x-on:|@)([^.]+)(?:\\..+)?$',
			potentialName: 'on$1',
			isDirective: true,
			isDynamicValue: true,
		},
		/**
		 * x-transition (with optional suffix like :enter, :leave, .duration, etc.)
		 * @see https://alpinejs.dev/directives/transition
		 */
		{
			pattern: '^x-transition(?:$|:|\\.)',
			isDirective: true,
		},
	],
	specs: [
		{
			name: 'template',
			attributes: {
				'x-for': {
					type: 'NoEmptyAny',
					description: 'Renders elements by iterating over arrays, objects, or numeric ranges',
				},
				key: {
					type: 'NoEmptyAny',
					description: 'A special attribute for list rendering that helps Alpine track changes',
					condition: '[x-for]',
				},
				'x-teleport': {
					type: 'NoEmptyAny',
					description: 'Moves the element DOM content to another location in the page',
				},
				'x-if': {
					type: 'NoEmptyAny',
					description: 'Conditionally adds/removes elements from the DOM entirely',
				},
			},
		},
		{
			name: 'input',
			attributes: {
				'x-model': {
					type: 'NoEmptyAny',
					condition: '[type=text i], [type=checkbox i], [type=radio i], [type=range i]',
				},
			},
		},
		{
			name: 'select',
			attributes: {
				'x-model': {
					type: 'NoEmptyAny',
				},
			},
		},
		{
			name: 'textarea',
			attributes: {
				'x-model': {
					type: 'NoEmptyAny',
				},
			},
		},
	],
	def: {
		'#globalAttrs': {
			'#extends': {
				/**
				 * Declares an element as an Alpine component and
				 * defines its reactive data scope
				 */
				'x-data': {
					type: 'Any',
				},
				/**
				 * Hooks into the initialization phase;
				 * runs code when the element initializes
				 */
				'x-init': {
					type: 'Any',
				},
				/**
				 * Toggles element visibility via CSS display property
				 */
				'x-show': {
					type: 'Any',
				},
				/**
				 * Sets the textContent of the element to the result
				 * of the expression
				 */
				'x-text': {
					type: 'Any',
				},
				/**
				 * Sets the innerHTML of the element to the result
				 * of the expression
				 */
				'x-html': {
					type: 'Any',
				},
				/**
				 * Creates two-way data binding between form elements
				 * and Alpine data
				 */
				'x-model': {
					type: 'Any',
				},
				/**
				 * Exposes an internal component property as the target
				 * of an outer x-model directive
				 */
				'x-modelable': {
					type: 'Any',
				},
				/**
				 * Runs the expression and reactively re-evaluates it
				 * whenever any of its referenced reactive data
				 * dependencies change
				 */
				'x-effect': {
					type: 'Any',
				},
				/**
				 * Marks an element with a name so it can be accessed
				 * via $refs in other Alpine expressions
				 */
				'x-ref': {
					type: 'Any',
				},
				/**
				 * Conditionally adds/removes elements from the DOM
				 * entirely. Must be on a template tag.
				 */
				'x-if': {
					type: 'Any',
				},
				/**
				 * Renders elements by iterating over arrays, objects,
				 * or numeric ranges. Must be on a template tag.
				 */
				'x-for': {
					type: 'Any',
				},
				/**
				 * Applies CSS transition animations to x-show toggles
				 */
				'x-transition': {
					type: 'Any',
				},
				/**
				 * CSS class names applied during the entire entering phase
				 */
				'x-transition:enter': {
					type: 'Any',
				},
				/**
				 * CSS class names applied before element is inserted
				 */
				'x-transition:enter-start': {
					type: 'Any',
				},
				/**
				 * CSS class names applied one frame after insertion
				 */
				'x-transition:enter-end': {
					type: 'Any',
				},
				/**
				 * CSS class names applied during the entire leaving phase
				 */
				'x-transition:leave': {
					type: 'Any',
				},
				/**
				 * CSS class names applied when leaving is triggered
				 */
				'x-transition:leave-start': {
					type: 'Any',
				},
				/**
				 * CSS class names applied one frame after leave starts
				 */
				'x-transition:leave-end': {
					type: 'Any',
				},
				/**
				 * Moves the element's DOM content to another location
				 * in the page. Must be on a template tag.
				 */
				'x-teleport': {
					type: 'Any',
				},
				/**
				 * Declares a new scope for auto-generated IDs
				 * via the $id() magic property
				 */
				'x-id': {
					type: 'Any',
				},
				/**
				 * Prevents Alpine from initializing the element
				 * and its children
				 */
				'x-ignore': {
					type: 'Boolean',
				},
				/**
				 * Hidden by Alpine on initialization; used with CSS
				 * rule [x-cloak] { display: none !important; }
				 * to prevent flash of unstyled content
				 */
				'x-cloak': {
					type: 'Boolean',
				},
			},
		},
	},
};

export default spec;
