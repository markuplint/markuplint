import type { Options } from '../types.js';
import type { AttrChecker } from '@markuplint/ml-core';
import type { ARIAProperty, Attribute } from '@markuplint/ml-spec';

import { isAriaTrue, isValidAriaValueType } from '@markuplint/ml-spec';
import { asciiLowerCase } from '@markuplint/shared';

import { resolveAttrEligibility } from '../../attr-eligibility.js';

import { isSameAsNative } from './equivalent-value.js';

/**
 * Without the native attribute, only `checked` has an implicit value that
 * `aria-*="true"` contradicts: the checkedness of the element can be in
 * opposition to `aria-checked`. ARIA in HTML §4.2 lets authors use
 * `aria-required`, `aria-disabled` and `aria-readonly` in place of their native
 * attributes, and forbids only the value `"false"` beside the native attribute.
 *
 * > Authors MUST NOT use the aria-checked attribute on any element where the checkedness, or the indeterminate checked value of the element can be in opposition to the current value of the aria-checked attribute.
 *
 * @see https://www.w3.org/TR/html-aria/#docconformance-attr
 */
const IMPLICIT_STATE_ATTRS: ReadonlySet<string> = new Set(['checked']);

/**
 * Beside these native attributes the ARIA attribute is forbidden whatever its value, the same one included; the
 * other rows forbid a value that differs (`aria-colspan`, `aria-rowspan`) or `"false"` (the Boolean ones).
 *
 * > Authors MUST NOT use the aria-placeholder attribute on any element which also has a placeholder attribute.
 *
 * > Authors MUST NOT use aria-valuemax on any element which also has a max attribute.
 *
 * > Authors MUST NOT use aria-valuemin on any element which also has a min attribute.
 *
 * @see https://www.w3.org/TR/html-aria/#docconformance-attr
 */
const FORBIDDEN_BESIDE_NATIVE_ATTRS: ReadonlySet<string> = new Set(['placeholder', 'max', 'min']);

/**
 * Checks whether an ARIA property's value contradicts an equivalent native
 * HTML attribute's current or implicit value.
 *
 * Many ARIA properties have equivalent HTML attributes (e.g., `aria-required`
 * and `required`). ARIA in HTML §4.2 has user agents ignore the `aria-*`
 * attribute beside its native equivalent, and forbids (MUST NOT) a value that
 * contradicts the native one, such as `aria-required="false"` beside `required`,
 * so that is a conformance violation, not merely a style preference (contrast
 * `checkingRedundantAriaProp`, which is should-level). Beside the attributes of
 * `FORBIDDEN_BESIDE_NATIVE_ATTRS` any value is forbidden. Without the native
 * attribute, only `checked` has an implicit value that `aria-*="true"`
 * contradicts (see `IMPLICIT_STATE_ATTRS`).
 *
 * @param attr - The ARIA attribute node to inspect.
 * @param propSpecs - The list of ARIA property specifications for equivalence lookup.
 * @param attrSpecs - The HTML attribute specifications for the element.
 * @returns A violation if the ARIA property contradicts an equivalent HTML attribute.
 */
export const checkingContradictoryAriaProp: AttrChecker<
	boolean,
	Options,
	{ propSpecs: readonly ARIAProperty[]; attrSpecs: readonly Attribute[] | null }
> =
	({ attr, propSpecs, attrSpecs }) =>
	t => {
		if (attr.isDynamicValue) {
			return;
		}
		const propSpec = propSpecs.find(p => p.name === attr.nameKey);
		// An editable element is not read-only, whatever element it is:
		//
		// > Authors MUST NOT set aria-readonly="true" on an element that has isContentEditable="true".
		//
		// @see https://www.w3.org/TR/html-aria/#docconformance-attr
		if (propSpec?.name === 'aria-readonly' && isAriaTrue(attr.value) && attr.ownerElement.isContentEditable) {
			// The element's own `contenteditable`, or that of the editing host it is in
			const own = attr.ownerElement.hasAttribute('contenteditable');
			return {
				scope: attr,
				message: t(
					'{0} contradicts {1}',
					t('the "{0*}" {1}', attr.name, `ARIA ${propSpec.type}`),
					own
						? t('the current "{0*}" {1}', 'contenteditable', 'attribute')
						: t('the "{0*}" {1}', 'contenteditable', 'attribute'),
				),
			};
		}
		if (!attrSpecs || !propSpec?.equivalentHtmlAttrs) {
			return;
		}
		// The zero-length string is the absent attribute, and a value that is not valid is the default
		// (`no-invalid-aria-prop-value` reports it): neither opposes a native attribute
		if (attr.value === '' || !isValidAriaValueType(propSpec.value, attr.value, propSpec.enum)) {
			return;
		}
		for (const equivalentHtmlAttr of propSpec.equivalentHtmlAttrs) {
			// The `contenteditable` row stands for the editable state, not for the attribute: it is the branch above
			// that compares it, with `isContentEditable`.
			if (equivalentHtmlAttr.condition) {
				continue;
			}
			const htmlAttrSpec = attrSpecs.find(a => a.name === equivalentHtmlAttr.htmlAttrName);
			const eligibility = resolveAttrEligibility(equivalentHtmlAttr.htmlAttrName, attr.ownerElement, attrSpecs);
			// Skip only when the native attribute doesn't apply to this element at all
			// (unknown name or an unmet condition) — mirrors the old
			// `invalidType === 'non-existent'` check. `noUse` still proceeds: an
			// explicitly-forbidden native attribute can still be "implicit" for
			// equivalence purposes.
			if (eligibility.status === 'unknown' || eligibility.status === 'condition-not-met') {
				continue;
			}

			if (attr.ownerElement.hasAttribute(equivalentHtmlAttr.htmlAttrName)) {
				const nativeType = eligibility.status === 'ok' ? eligibility.spec.type : htmlAttrSpec?.type;
				if (
					!FORBIDDEN_BESIDE_NATIVE_ATTRS.has(equivalentHtmlAttr.htmlAttrName) &&
					isSameAsNative(
						attr.value,
						attr.ownerElement.getAttribute(equivalentHtmlAttr.htmlAttrName),
						nativeType,
						equivalentHtmlAttr.htmlAttrName,
						equivalentHtmlAttr.value,
					)
				) {
					// Redundant, not contradictory — `checkingRedundantAriaProp`'s concern.
					continue;
				}
				// Beside a native attribute whose presence stands for a keyword, only `"false"` contradicts it (a keyword as
				// browsers read it)
				if (equivalentHtmlAttr.value != null && asciiLowerCase(attr.value) !== 'false') {
					continue;
				}
				return {
					scope: attr,
					message: t(
						'{0} contradicts {1}',
						t('the "{0*}" {1}', attr.name, `ARIA ${propSpec.type}`),
						t('the current "{0*}" {1}', equivalentHtmlAttr.htmlAttrName, 'attribute'),
					),
				};
			} else if (
				isAriaTrue(attr.value) &&
				IMPLICIT_STATE_ATTRS.has(equivalentHtmlAttr.htmlAttrName) &&
				!equivalentHtmlAttr.isNotStrictEquivalent &&
				htmlAttrSpec?.type === 'Boolean'
			) {
				return {
					scope: attr,
					message: t(
						'{0} contradicts {1}',
						t('the "{0*}" {1}', attr.name, `ARIA ${propSpec.type}`),
						t('the implicit "{0*}" {1}', equivalentHtmlAttr.htmlAttrName, 'attribute'),
					),
				};
			}
		}
	};
