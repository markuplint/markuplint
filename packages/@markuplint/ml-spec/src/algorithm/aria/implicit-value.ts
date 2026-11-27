import type { ARIAVersion } from '../../types/index.js';

/**
 * The value that a role gives a state or property in place of its default: the Implicit Value for Role of the role in
 * each edition, which the element has when the author does not set the attribute. A row that names no value (the
 * minimum of `spinbutton`, the `aria-valuenow` of `slider` half way between its minimum and maximum) is left out.
 *
 * > Roles that require a state or property to have a non-standard default value indicate this in the "Implicit Value for Role".
 *
 * > Elements with the role alert have an implicit aria-live value of assertive, and an implicit aria-atomic value of true.
 *
 * > Elements with the role combobox have an implicit aria-haspopup value of listbox.
 *
 * > Elements with the role listbox have an implicit aria-orientation value of vertical.
 *
 * > Elements with the role log have an implicit aria-live value of polite.
 *
 * > Elements with the role menu have an implicit aria-orientation value of vertical.
 *
 * > Elements with the role menubar have an implicit aria-orientation value of horizontal.
 *
 * > Default for aria-valuemin is 0.
 *
 * > Default for aria-valuemax is 100.
 *
 * > Elements with the role scrollbar have an implicit aria-orientation value of vertical.
 *
 * > Elements with the role separator have an implicit aria-orientation value of horizontal.
 *
 * > Elements with the role slider have an implicit aria-orientation value of horizontal.
 *
 * > Elements with the role status have an implicit aria-live value of polite and an implicit aria-atomic value of true.
 *
 * > Default for aria-selected is false.
 *
 * > Elements with the role tablist have an implicit aria-orientation value of horizontal.
 *
 * > Elements with the role toolbar have an implicit aria-orientation value of horizontal.
 *
 * > Elements with the role tree have an implicit aria-orientation value of vertical.
 *
 * The rows of ARIA 1.1 and 1.2 are those of their Recommendations (1.1 also gives `aria-checked` of the checkable
 * roles, `aria-expanded` of `combobox`, `aria-level` of `heading`, and `aria-valuenow` of `separator` and
 * `spinbutton`; 1.2 `aria-selected` of `option` and `aria-valuenow` of `spinbutton`), which the citations of this
 * package do not check, as they cite the editor's draft.
 *
 * @see https://w3c.github.io/aria/#implictValueForRole
 * @see https://w3c.github.io/aria/#alert
 * @see https://w3c.github.io/aria/#combobox
 * @see https://w3c.github.io/aria/#listbox
 * @see https://w3c.github.io/aria/#log
 * @see https://w3c.github.io/aria/#menu
 * @see https://w3c.github.io/aria/#menubar
 * @see https://w3c.github.io/aria/#meter
 * @see https://w3c.github.io/aria/#scrollbar
 * @see https://w3c.github.io/aria/#separator
 * @see https://w3c.github.io/aria/#slider
 * @see https://w3c.github.io/aria/#status
 * @see https://w3c.github.io/aria/#tab
 * @see https://w3c.github.io/aria/#tablist
 * @see https://w3c.github.io/aria/#toolbar
 * @see https://w3c.github.io/aria/#tree
 */
const COMMON: Readonly<Record<string, Readonly<Record<string, string>>>> = {
	alert: { 'aria-live': 'assertive', 'aria-atomic': 'true' },
	combobox: { 'aria-haspopup': 'listbox' },
	listbox: { 'aria-orientation': 'vertical' },
	log: { 'aria-live': 'polite' },
	menu: { 'aria-orientation': 'vertical' },
	menubar: { 'aria-orientation': 'horizontal' },
	scrollbar: { 'aria-orientation': 'vertical', 'aria-valuemin': '0', 'aria-valuemax': '100' },
	separator: { 'aria-orientation': 'horizontal', 'aria-valuemin': '0', 'aria-valuemax': '100' },
	slider: { 'aria-orientation': 'horizontal', 'aria-valuemin': '0', 'aria-valuemax': '100' },
	status: { 'aria-live': 'polite', 'aria-atomic': 'true' },
	tab: { 'aria-selected': 'false' },
	tablist: { 'aria-orientation': 'horizontal' },
	toolbar: { 'aria-orientation': 'horizontal' },
	tree: { 'aria-orientation': 'vertical' },
};

const IMPLICIT_VALUES: Readonly<Record<ARIAVersion, Readonly<Record<string, Readonly<Record<string, string>>>>>> = {
	'1.1': {
		...COMMON,
		checkbox: { 'aria-checked': 'false' },
		combobox: { 'aria-expanded': 'false', 'aria-haspopup': 'listbox' },
		heading: { 'aria-level': '2' },
		menuitemcheckbox: { 'aria-checked': 'false' },
		menuitemradio: { 'aria-checked': 'false' },
		option: { 'aria-selected': 'false' },
		radio: { 'aria-checked': 'false' },
		separator: { ...COMMON.separator, 'aria-valuenow': '50' },
		spinbutton: { 'aria-valuenow': '0' },
		switch: { 'aria-checked': 'false' },
	},
	'1.2': {
		...COMMON,
		meter: { 'aria-valuemin': '0', 'aria-valuemax': '100' },
		option: { 'aria-selected': 'false' },
		progressbar: { 'aria-valuemin': '0', 'aria-valuemax': '100' },
		spinbutton: { 'aria-valuenow': '0' },
	},
	'1.3': {
		...COMMON,
		meter: { 'aria-valuemin': '0', 'aria-valuemax': '100' },
		progressbar: { 'aria-valuemin': '0', 'aria-valuemax': '100' },
	},
};

/**
 * The value that a native `progress` or `meter` gives in place of the implicit value of its role: the default of its
 * `max` is 1.0 and the minimum is 0, which its value range maps to.
 *
 * @see https://w3c.github.io/html-aam/#el-progress
 * @see https://html.spec.whatwg.org/multipage/form-elements.html#attr-progress-max
 */
const NATIVE_RANGE: Readonly<Record<string, string>> = { 'aria-valuemin': '0', 'aria-valuemax': '1' };

/**
 * The value that an element of a role has for a state or property when the author does not set it: the implicit value
 * of its role, if the role gives one, for a native `progress` or `meter` the range of the element, and for a heading
 * element its rank. The value of a native attribute that the element has (`min`, `max`, `checked`) comes before it,
 * which this does not read.
 *
 * @example
 * getImplicitValueOfRole(null, 'alert', 'aria-live', '1.3'); // 'assertive'
 *
 * @param el - The element, or null when only the role is known
 * @param role - The name of the role
 * @param property - The name of the state or property
 * @param version - The ARIA version
 * @returns The implicit value, or null when the role gives none (the default of the property applies)
 */
export function getImplicitValueOfRole(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	el: Element | null,
	role: string,
	property: string,
	version: ARIAVersion,
): string | null {
	if (el?.namespaceURI === 'http://www.w3.org/1999/xhtml') {
		if ((el.localName === 'progress' || el.localName === 'meter') && property in NATIVE_RANGE) {
			return NATIVE_RANGE[property] ?? null;
		}
		// The level of a heading element is its rank
		// @see https://www.w3.org/TR/html-aria/#el-h1-h6
		if (property === 'aria-level' && /^h[1-6]$/.test(el.localName)) {
			return el.localName.slice(1);
		}
	}
	return IMPLICIT_VALUES[version][role]?.[property] ?? null;
}

/**
 * @param property - The name of a state or property
 * @param version - The ARIA version
 * @returns Whether some role gives it an implicit value, so that what an element has without it depends on the role
 */
export function hasImplicitValueOfSomeRole(property: string, version: ARIAVersion): boolean {
	return Object.values(IMPLICIT_VALUES[version]).some(values => property in values);
}
