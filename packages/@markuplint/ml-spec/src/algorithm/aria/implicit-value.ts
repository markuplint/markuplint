/**
 * The value that a role gives a state or property in place of its default: the "Implicit Value for Role" of the role,
 * which the element has when the author does not set the attribute.
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
 * The values of `aria-valuemin` and `aria-valuemax` are those of `meter`, `progressbar`, `scrollbar`, `separator`
 * and `slider`; that of `aria-selected`, of `tab`. The defaults of `spinbutton` ("that there is no minimum value")
 * are no value. The table is that of the editor's draft, whose implicit values the earlier editions have as well.
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
const IMPLICIT_VALUES: Readonly<Record<string, Readonly<Record<string, string>>>> = {
	alert: { 'aria-live': 'assertive', 'aria-atomic': 'true' },
	combobox: { 'aria-haspopup': 'listbox' },
	listbox: { 'aria-orientation': 'vertical' },
	log: { 'aria-live': 'polite' },
	menu: { 'aria-orientation': 'vertical' },
	menubar: { 'aria-orientation': 'horizontal' },
	meter: { 'aria-valuemin': '0', 'aria-valuemax': '100' },
	progressbar: { 'aria-valuemin': '0', 'aria-valuemax': '100' },
	scrollbar: { 'aria-orientation': 'vertical', 'aria-valuemin': '0', 'aria-valuemax': '100' },
	separator: { 'aria-orientation': 'horizontal', 'aria-valuemin': '0', 'aria-valuemax': '100' },
	slider: { 'aria-orientation': 'horizontal', 'aria-valuemin': '0', 'aria-valuemax': '100' },
	status: { 'aria-live': 'polite', 'aria-atomic': 'true' },
	tab: { 'aria-selected': 'false' },
	tablist: { 'aria-orientation': 'horizontal' },
	toolbar: { 'aria-orientation': 'horizontal' },
	tree: { 'aria-orientation': 'vertical' },
};

/**
 * The value that an element of a role has for a state or property when the author does not set it: the implicit value
 * of the role, if the role gives one.
 *
 * @param role - The name of the role
 * @param property - The name of the state or property
 * @returns The implicit value, or null when the role gives none (the default of the property applies)
 */
export function getImplicitValueOfRole(role: string, property: string): string | null {
	return IMPLICIT_VALUES[role]?.[property] ?? null;
}
