import type { Options } from '../types.js';
import type { AttrChecker } from '@markuplint/ml-core';
import type { ARIAProperty, Attribute } from '@markuplint/ml-spec';

import { resolveAttrEligibility } from '../../attr-eligibility.js';

import { isSameAsNative } from './equivalent-value.js';

/**
 * Checks whether an ARIA property is redundant because an equivalent native
 * HTML attribute already conveys the same semantics with the same value —
 * either the current value of that attribute, or (when absent) its implicit
 * default.
 *
 * Many ARIA properties have equivalent HTML attributes (e.g., `aria-required`
 * and `required`). ARIA in HTML §4.2 says authors SHOULD NOT specify both the
 * native attribute and the equivalent `aria-*` attribute, so restating the same
 * value via `aria-*` is superfluous.
 *
 * @param attr - The ARIA attribute node to inspect.
 * @param propSpecs - The list of ARIA property specifications for equivalence lookup.
 * @param attrSpecs - The HTML attribute specifications for the element.
 * @returns A violation if the ARIA property redundantly restates an equivalent HTML attribute.
 */
export const checkingRedundantAriaProp: AttrChecker<
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
		// The zero-length string is the absent attribute, which restates nothing
		if (attr.value === '') {
			return;
		}
		for (const equivalentHtmlAttr of propSpec.equivalentHtmlAttrs) {
			// The `contenteditable` row stands for the editable state, which the attribute does not tell, and ARIA in
			// HTML has no SHOULD NOT for restating it (`aria-readonly="false"`), only the MUST NOT of
			// `no-contradictory-aria-prop`.
			if (equivalentHtmlAttr.condition) {
				continue;
			}
			const eligibility = resolveAttrEligibility(equivalentHtmlAttr.htmlAttrName, attr.ownerElement, attrSpecs);
			// Skip only when the native attribute doesn't apply to this element at all
			// (unknown name or an unmet condition) — mirrors the old
			// `invalidType === 'non-existent'` check. `noUse` still proceeds: an
			// explicitly-forbidden native attribute can still be "implicit" for
			// equivalence purposes.
			if (eligibility.status === 'unknown' || eligibility.status === 'condition-not-met') {
				continue;
			}

			if (!attr.ownerElement.hasAttribute(equivalentHtmlAttr.htmlAttrName)) {
				continue;
			}

			const nativeType =
				eligibility.status === 'ok'
					? eligibility.spec.type
					: attrSpecs.find(a => a.name === equivalentHtmlAttr.htmlAttrName)?.type;
			if (
				isSameAsNative(
					attr.value,
					attr.ownerElement.getAttribute(equivalentHtmlAttr.htmlAttrName),
					nativeType,
					equivalentHtmlAttr.htmlAttrName,
					equivalentHtmlAttr.value,
				)
			) {
				return {
					scope: attr,
					message: t(
						'{0} has {1}',
						t('the "{0*}" {1}', attr.name, `ARIA ${propSpec.type}`),
						t(
							'the same {0} as {1}',
							'semantics',
							t(
								'{0} or {1}',
								t('the current "{0*}" {1}', equivalentHtmlAttr.htmlAttrName, 'attribute'),
								t('the implicit "{0*}" {1}', equivalentHtmlAttr.htmlAttrName, 'attribute'),
							),
						),
					),
				};
			}
		}
	};
