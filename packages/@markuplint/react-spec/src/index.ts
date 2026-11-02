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
	/**
	 * How React renders a literal in `{…}` (`pushAttribute` of `react-dom-server`, and
	 * `setValueForAttribute` / `setValueForPropertyOnCustomComponent` of `react-dom-bindings`), where it
	 * differs from the default of `@markuplint/ml-core`. Names are in lower case.
	 *
	 * - A boolean is dropped on an attribute that is not `aria-*` / `data-*` (`otherAttrs`), and the empty
	 *   string on a boolean attribute is not output (`booleanAttrs`): `disabled={""}` has no `disabled`
	 * - The attributes that are strings of `"true"` / `"false"` (the "booleanish string" group of React)
	 *   keep a boolean as the string
	 * - `capture` and `download` are present for `true`; `cols`, `rows`, `size` and `span` are output only
	 *   for a number from 1
	 * - A custom element sets `true` as `""` on any attribute, and keeps `false` on `aria-*` / `data-*` only
	 *
	 * What it does not tell, which does not affect a rule, or which the markup says wrongly (`invalid-attr`
	 * reports it):
	 *
	 * - `hidden={"until-found"}` is `hidden=""` in React, while this keeps the string
	 * - A number below 1, and a string that is not a number, on `cols` / `rows` / `size` / `span` is not
	 *   output in React, while this keeps it
	 * - `scoped` and `seamless`, obsolete attributes that React renders as boolean, are not in the spec
	 *
	 * @see https://react.dev/reference/react-dom/components/common
	 */
	literalValues: {
		booleanAttrs: { '""': null },
		otherAttrs: { true: null, false: null },
		attrs: {
			// The "booleanish string" group: `contentEditable={true}` is `contenteditable="true"`
			contenteditable: { true: 'true', false: 'false' },
			spellcheck: { true: 'true', false: 'false' },
			draggable: { true: 'true', false: 'false' },
			value: { true: 'true', false: 'false' },
			autoreverse: { true: 'true', false: 'false' },
			externalresourcesrequired: { true: 'true', false: 'false' },
			focusable: { true: 'true', false: 'false' },
			preservealpha: { true: 'true', false: 'false' },
			// Overloaded booleans: `true` is present without a value
			capture: { true: '', false: null },
			download: { true: '', false: null },
			// `hidden` is one of its booleans, so the empty string is falsy
			hidden: { '""': null },
			// A number from 1 is output (`1 <= value`)
			cols: { '0': null, '""': null, true: 'true' },
			rows: { '0': null, '""': null, true: 'true' },
			size: { '0': null, '""': null, true: 'true' },
			span: { '0': null, '""': null, true: 'true' },
			// Booleans of React that the spec does not know as boolean
			disablepictureinpicture: { true: '', false: null, '0': null, '""': null },
			disableremoteplayback: { true: '', false: null, '0': null, '""': null },
			// Boolean attributes of the spec that React does not render as boolean, so it drops a boolean
			alpha: { true: null, false: null },
			focusgroupstart: { true: null, false: null },
			headingreset: { true: null, false: null },
			ismap: { true: null, false: null },
			shadowrootclonable: { true: null, false: null },
			shadowrootcustomelementregistry: { true: null, false: null },
			shadowrootdelegatesfocus: { true: null, false: null },
			shadowrootserializable: { true: null, false: null },
			switch: { true: null, false: null },
			suppresscontenteditablewarning: { true: null, false: null },
			suppresshydrationwarning: { true: null, false: null },
		},
		customElements: {
			booleanAttrs: { '""': '', '0': '0' },
			ariaAttrs: { true: '' },
			dataAttrs: { true: '' },
			otherAttrs: { true: '', false: null },
		},
	},
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
