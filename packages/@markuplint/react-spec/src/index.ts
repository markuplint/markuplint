/**
 * @module @markuplint/react-spec
 *
 * Provides React-specific extended specifications for markuplint.
 * Defines React's JSX global attributes (such as `key`, `ref`,
 * `dangerouslySetInnerHTML`, and hydration/contentEditable warning
 * suppression flags) as well as element-level attribute overrides
 * for controlled and uncontrolled form components (`input`, `select`,
 * `textarea`).
 */

import type { ExtendedSpec } from '@markuplint/ml-spec';

/**
 * The React framework extended specification.
 *
 * Registers global JSX attributes available on every element and
 * provides per-element attribute definitions for React's controlled
 * and uncontrolled form component patterns (`defaultChecked`,
 * `defaultValue`, `value`).
 */
const spec: ExtendedSpec = {
	/**
	 * Set to `'idl'` because React JSX accepts only IDL property names
	 * (e.g. `className`, `htmlFor`), unlike Svelte which accepts both
	 * forms (`'both'`). The resolution of IDL names to HTML content
	 * attribute names — and the IDL-name candidate suggestion (e.g.
	 * `tabindex` -> "Did you mean `tabIndex`?") — is performed by
	 * `MLAttr` in `@markuplint/ml-core`, not by `@markuplint/jsx-parser`.
	 */
	acceptedAttrNames: 'idl',
	def: {
		'#globalAttrs': {
			'#extends': {
				/**
				 * A special attribute for list rendering
				 */
				key: {
					type: 'Any',
				},
				/**
				 * A special attribute for accessing child component instances
				 * and child elements
				 */
				ref: {
					type: 'Any',
				},
				/**
				 * React's replacement for using innerHTML in the browser DOM
				 */
				dangerouslySetInnerHTML: {
					type: 'Any',
				},
				/**
				 * Normally, there is a warning when an element with children
				 * is also marked as contentEditable, because it won't work.
				 * This attribute suppresses that warning.
				 */
				suppressContentEditableWarning: {
					type: 'Boolean',
				},
				/**
				 * If you set suppressHydrationWarning to true,
				 * React will not warn you about mismatches
				 * in the attributes and the content of that element.
				 */
				suppressHydrationWarning: {
					type: 'Boolean',
				},
				/**
				 * React accepts "inherit" as a valid contentEditable value
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
	specs: [
		{
			name: 'input',
			attributes: {
				/**
				 * defaultChecked is the uncontrolled equivalent,
				 * which sets whether the component is checked
				 * when it is first mounted.
				 */
				defaultChecked: {
					type: 'Boolean',
					caseSensitive: true,
					condition: ['[type=checkbox]', '[type=radio]'],
				},
				/**
				 * defaultValue is the uncontrolled equivalent,
				 * which sets the value of the component
				 * when it is first mounted.
				 */
				defaultValue: {
					type: 'Any',
					caseSensitive: true,
				},
			},
		},
		{
			name: 'select',
			attributes: {
				/**
				 * The value attribute is supported by
				 * <input>, <select> and <textarea> components.
				 * You can use it to set the value of the component.
				 */
				value: {
					type: 'Any',
				},
				/**
				 * defaultValue is the uncontrolled equivalent,
				 * which sets the value of the component
				 * when it is first mounted.
				 */
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
				 * The value attribute is supported by
				 * <input>, <select> and <textarea> components.
				 * You can use it to set the value of the component.
				 */
				value: {
					type: 'Any',
				},
				/**
				 * defaultValue is the uncontrolled equivalent,
				 * which sets the value of the component
				 * when it is first mounted.
				 */
				defaultValue: {
					type: 'Any',
					caseSensitive: true,
				},
			},
		},
	],
};

export default spec;
