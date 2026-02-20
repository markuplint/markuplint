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
	useIDLAttributeNames: true,
	directivePatterns: [
		// bind:group, bind:this → true directives
		{
			pattern: '^bind:(?:group|this)$',
			isDirective: true,
			isDynamicValue: true,
		},
		// bind:name → potentialName=name, isDynamicValue
		{
			pattern: '^bind:(.+)$',
			potentialName: '$1',
			isDynamicValue: true,
		},
		// on:event (Svelte 4 legacy)
		{
			pattern: '^on:.+$',
			isDirective: true,
			isDynamicValue: true,
		},
		// class:name → potentialName=class, isDuplicatable
		{
			pattern: '^class:',
			potentialName: 'class',
			isDuplicatable: true,
			isDynamicValue: true,
		},
		// style:property → potentialName=style, isDuplicatable
		{
			pattern: '^style:',
			potentialName: 'style',
			isDuplicatable: true,
			isDynamicValue: true,
		},
		// animate:, transition:, in:, out:, use:, let: → isDirective
		{
			pattern: '^(?:animate|transition|in|out|use|let):',
			isDirective: true,
		},
	],
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
