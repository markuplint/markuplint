/**
 * @module @markuplint/svelte-spec
 *
 * Provides Svelte-specific extended specifications for markuplint.
 * Defines element-level attribute overrides for Svelte's two-way
 * binding behavior on form elements and IDL property attributes
 * such as `defaultValue`, `defaultChecked`, and `indeterminate`.
 */

import type { ExtendedSpec } from '@markuplint/ml-spec';

/**
 * The Svelte framework extended specification.
 *
 * Provides per-element attribute definitions that accommodate
 * Svelte's two-way binding (`bind:value`) and IDL property
 * attributes on form elements.
 */
const spec: ExtendedSpec = {
	specs: [
		{
			name: 'input',
			attributes: {
				defaultChecked: {
					type: 'Boolean',
					caseSensitive: true,
					condition: ['[type=checkbox]', '[type=radio]'],
				},
				defaultValue: {
					type: 'Any',
					caseSensitive: true,
				},
				indeterminate: {
					type: 'Boolean',
					caseSensitive: true,
					condition: '[type=checkbox]',
				},
			},
		},
		{
			name: 'select',
			attributes: {
				value: {
					type: 'Any',
				},
				defaultValue: {
					type: 'Any',
					caseSensitive: true,
				},
			},
		},
		{
			name: 'textarea',
			attributes: {
				value: {
					type: 'Any',
				},
				defaultValue: {
					type: 'Any',
					caseSensitive: true,
				},
			},
		},
	],
};

export default spec;
