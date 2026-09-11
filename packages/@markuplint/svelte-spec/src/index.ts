/**
 * @module @markuplint/svelte-spec
 *
 * Provides Svelte-specific extended specifications for markuplint.
 * Defines element-level attribute overrides for Svelte's two-way
 * binding behavior on form elements and IDL property attributes
 * such as `defaultValue`, `defaultChecked`, and `indeterminate`.
 *
 * This package intentionally has no test files: it exports only a
 * static data object whose shape is verified by the TypeScript build
 * against the `ExtendedSpec` type, and its behavior is covered by the
 * `@markuplint/svelte-parser` integration tests.
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
	/**
	 * `'both'` rather than `'idl'` (React) because Svelte templates use
	 * standard HTML content attribute names, so IDL spellings must not be
	 * suggested as renames; IDL names such as `defaultValue` are still
	 * resolved to their content attribute equivalents by `MLAttr` in
	 * `@markuplint/ml-core`, not by the parser.
	 */
	acceptedAttrNames: 'both',
	def: {
		'#globalAttrs': {
			'#extends': {
				/**
				 * Svelte accepts "inherit" as a valid contentEditable value
				 * (IDL state value from the ContentEditable interface).
				 */
				contenteditable: {
					type: {
						enum: ['', 'true', 'false', 'plaintext-only', 'inherit'],
						disallowToSurroundBySpaces: true,
						invalidValueDefault: 'inherit',
						missingValueDefault: 'inherit',
						sameStates: { true: [''] },
					},
				},
			},
		},
	},
	/**
	 * The core engine evaluates these in order and the first match wins,
	 * so `^bind:(?:group|this)$` must precede the generic `^bind:(.+)$`;
	 * otherwise `bind:group` / `bind:this` would resolve to nonexistent
	 * `group` / `this` attributes instead of staying directives.
	 */
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
				/**
				 * Standard HTML has no `value` content attribute on `select`;
				 * Svelte accepts it, and `bind:value` allows any type, not
				 * just strings.
				 */
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
				/**
				 * Standard HTML has no `value` content attribute on `textarea`;
				 * Svelte accepts it, and `bind:value` allows any type, not
				 * just strings.
				 */
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
