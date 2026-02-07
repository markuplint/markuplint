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
