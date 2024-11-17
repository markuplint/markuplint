import type { Options } from '../types.js';
import type { AttrChecker } from '@markuplint/ml-core';
import type { ARIAProperty, Attribute } from '@markuplint/ml-spec';

import { isValidAttr } from '../../helpers.js';

export const checkingImplicitProps: AttrChecker<
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
		const propSpec = propSpecs.find(p => p.name === attr.name);
		if (!propSpec?.equivalentHtmlAttrs) {
			return;
		}
		for (const equivalentHtmlAttr of propSpec.equivalentHtmlAttrs) {
			const htmlAttrSpec = attrSpecs.find(a => a.name === equivalentHtmlAttr.htmlAttrName);
			const isValid = isValidAttr(
				t,
				equivalentHtmlAttr.htmlAttrName,
				equivalentHtmlAttr.value ?? '',
				false,
				attr.ownerElement,
				attrSpecs,
			);
			if (isValid !== false && !Array.isArray(isValid) && isValid.invalidType === 'non-existent') {
				continue;
			}

			const value = attr.value.trim().toLowerCase();

			if (attr.ownerElement.hasAttribute(equivalentHtmlAttr.htmlAttrName)) {
				const targetAttrValue = attr.ownerElement.getAttribute(equivalentHtmlAttr.htmlAttrName);
				if (
					(equivalentHtmlAttr.value == null && targetAttrValue === value) ||
					equivalentHtmlAttr.value === value
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
									t('the current "{0}" {1}', equivalentHtmlAttr.htmlAttrName, 'attribute'),
									t('the implicit "{0}" {1}', equivalentHtmlAttr.htmlAttrName, 'attribute'),
								),
							),
						),
					};
				}
				if (htmlAttrSpec?.type === 'Boolean' && value !== 'false') {
					continue;
				}
				return {
					scope: attr,
					message: t(
						'{0} contradicts {1}',
						t('the "{0*}" {1}', attr.name, `ARIA ${propSpec.type}`),
						t('the current "{0}" {1}', equivalentHtmlAttr.htmlAttrName, 'attribute'),
					),
				};
			} else if (
				value === 'true' &&
				!equivalentHtmlAttr.isNotStrictEquivalent &&
				htmlAttrSpec?.type === 'Boolean'
			) {
				return {
					scope: attr,
					message: t(
						'{0} contradicts {1}',
						t('the "{0*}" {1}', attr.name, `ARIA ${propSpec.type}`),
						t('the implicit "{0}" {1}', equivalentHtmlAttr.htmlAttrName, 'attribute'),
					),
				};
			}
		}
	};
