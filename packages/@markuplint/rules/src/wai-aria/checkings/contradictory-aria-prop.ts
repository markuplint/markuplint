import type { Options } from '../types.js';
import type { AttrChecker } from '@markuplint/ml-core';
import type { ARIAProperty, Attribute } from '@markuplint/ml-spec';

import { resolveAttrEligibility } from '../../attr-eligibility.js';

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
 * Checks whether an ARIA property's value contradicts an equivalent native
 * HTML attribute's current or implicit value.
 *
 * Many ARIA properties have equivalent HTML attributes (e.g., `aria-required`
 * and `required`). ARIA in HTML §4.2 has user agents ignore the `aria-*`
 * attribute beside its native equivalent, and forbids (MUST NOT) a value that
 * contradicts the native one, such as `aria-required="false"` beside `required`,
 * so that is a conformance violation, not merely a style preference (contrast
 * `checkingRedundantAriaProp`, which is should-level). Without the native
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
		if (!attrSpecs) {
			return;
		}
		if (attr.isDynamicValue) {
			return;
		}
		const propSpec = propSpecs.find(p => p.name === attr.nameKey);
		if (!propSpec?.equivalentHtmlAttrs) {
			return;
		}
		for (const equivalentHtmlAttr of propSpec.equivalentHtmlAttrs) {
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

			const value = attr.value.trim().toLowerCase();

			if (attr.ownerElement.hasAttribute(equivalentHtmlAttr.htmlAttrName)) {
				const targetAttrValue = attr.ownerElement.getAttribute(equivalentHtmlAttr.htmlAttrName);
				if (
					(equivalentHtmlAttr.value == null && targetAttrValue === value) ||
					equivalentHtmlAttr.value === value
				) {
					// Redundant, not contradictory — `checkingRedundantAriaProp`'s concern.
					continue;
				}
				if (htmlAttrSpec?.type === 'Boolean' && value !== 'false') {
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
				value === 'true' &&
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
