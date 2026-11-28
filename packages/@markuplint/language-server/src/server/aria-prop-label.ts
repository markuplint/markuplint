import { t } from '../i18n.js';

/**
 * The hover label of one ARIA property of an element: its value, or that it has none, marked with `requiredLabel`
 * when the role requires it of the author and the author has not written it, as `require-aria-prop` reports it.
 *
 * The value that the author did not write is the default (`from: 'default'`: the default of the property, or the
 * implicit value of the role, such as `50` of `aria-valuenow` of `separator` in ARIA 1.1), which is shown, and
 * marked when the property is required. A property that the element itself satisfies (`satisfiedByElement`: the
 * implicit role, or a native attribute in its place) is not marked: the rules do not ask the author for it either.
 *
 * The engine may be an older markuplint, which gives neither `from` nor `satisfiedByElement`; its absent value is
 * `null` (`value: prop.value ?? null` in ml-core) or `undefined`, and such a required property is marked.
 *
 * @param prop - The property, as `getAccessibilityProp` of ml-core gives it
 * @param prop.value - The value of the property, `null` (or `undefined`) when it has none
 * @param prop.required - Whether the role requires it of this element
 * @param prop.satisfiedByElement - Present when the element itself satisfies the requirement
 * @param prop.from - Where the value comes from; absent from an older engine
 * @param requiredLabel - The mark of a required property that the author has to write
 * @returns The label
 */
export function ariaPropLabel(
	prop: {
		readonly value: string | null | undefined;
		readonly required: boolean;
		readonly satisfiedByElement?: true;
		readonly from?: 'default' | 'html-attr' | 'aria-attr';
	},
	requiredLabel: string,
): string {
	const label = prop.value == null ? t('Undefined') : `\`${prop.value}\``;
	const notWritten = prop.from === undefined ? prop.value == null : prop.from === 'default';
	return prop.required && !prop.satisfiedByElement && notWritten ? `${label} ${requiredLabel}` : label;
}
