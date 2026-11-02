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
	/**
	 * How Svelte renders a literal in `{…}` on the server (`attr` of `svelte/internal/shared/attributes.js`
	 * and `DOM_BOOLEAN_ATTRIBUTES` of `svelte/utils.js`), where it differs from the default of
	 * `@markuplint/ml-core`. Names are in lower case.
	 *
	 * - "Boolean attributes are included on the element if their value is truthy and excluded if it's falsy",
	 *   and "All other attributes are included unless their value is nullish" (the docs of Svelte). The one
	 *   exception is the empty string on a boolean attribute, which is present (`booleanAttrs`)
	 * - `translate={true}` is `translate="yes"` and `translate={false}` is `translate="no"`
	 *
	 * What it does not tell, which does not affect a rule:
	 *
	 * - A non-empty string literal on a boolean attribute (`disabled={"x"}`) is `""` here, which is how the
	 *   client and the other frameworks render it; the server renders `disabled="x"`
	 * - The client sets a boolean attribute as the property, so `""` is absent there
	 * - A custom element is rendered as any element on the server (the compiler only keeps the case of its
	 *   attribute names), so there is no `customElements` table; the client sets the properties that the
	 *   element declares (`set_custom_element_data`), which are not attributes
	 *
	 * @see https://svelte.dev/docs/svelte/basic-markup#Attributes-and-props
	 */
	literalValues: {
		booleanAttrs: { '""': '' },
		attrs: {
			translate: { true: 'yes', false: 'no' },
			// Booleans of Svelte that the spec does not know as boolean
			disablepictureinpicture: { true: '', false: null, '0': null },
			disableremoteplayback: { true: '', false: null, '0': null },
			indeterminate: { true: '', false: null, '0': null },
			webkitdirectory: { true: '', false: null, '0': null },
			// Boolean attributes of the spec that Svelte does not render as boolean
			alpha: { true: 'true', false: 'false', '0': '0', '""': '' },
			focusgroupstart: { true: 'true', false: 'false', '0': '0', '""': '' },
			headingreset: { true: 'true', false: 'false', '0': '0', '""': '' },
			shadowrootclonable: { true: 'true', false: 'false', '0': '0', '""': '' },
			shadowrootcustomelementregistry: { true: 'true', false: 'false', '0': '0', '""': '' },
			shadowrootdelegatesfocus: { true: 'true', false: 'false', '0': '0', '""': '' },
			shadowrootserializable: { true: 'true', false: 'false', '0': '0', '""': '' },
			switch: { true: 'true', false: 'false', '0': '0', '""': '' },
		},
	},
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
