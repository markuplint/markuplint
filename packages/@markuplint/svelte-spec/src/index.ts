/**
 * @module @markuplint/svelte-spec
 *
 * Provides Svelte-specific extended specifications for markuplint.
 * Defines element-level attribute overrides for Svelte's two-way
 * binding behavior on form elements (`<select>` and `<textarea>`),
 * where the `value` attribute accepts any type to support bound
 * variables.
 */

import type { ExtendedSpec } from '@markuplint/ml-spec';

/**
 * The Svelte framework extended specification.
 *
 * Provides per-element attribute definitions that accommodate
 * Svelte's two-way binding (`bind:value`) on `<select>` and
 * `<textarea>` elements, allowing the `value` attribute to accept
 * any type rather than only strings.
 */
const spec: ExtendedSpec = {
	specs: [
		{
			name: 'select',
			attributes: {
				value: {
					type: 'Any',
				},
			},
		},
		{
			name: 'textarea',
			attributes: {
				value: {
					type: 'Any',
				},
			},
		},
	],
};

export default spec;
