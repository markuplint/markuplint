import type { Options } from '../types.js';
import type { AttrChecker } from '@markuplint/ml-core';
import type { ARIAProperty, ARIARole } from '@markuplint/ml-spec';

import { ARIA_RECOMMENDED_VERSION, getARIA } from '@markuplint/ml-spec';

/**
 * Checks the ARIA in HTML element-specific `aria-*` restrictions: spec data
 * may forbid every `aria-*` attribute on an element with no implicit role
 * (`properties: false`, e.g. `input[type=hidden]`), whitelist a small set
 * (`properties: { only: [...] }`, e.g. `<br>`/`<wbr>` accept only
 * `aria-hidden`), or blacklist specific properties with a suggested
 * alternative (`properties: { without: [...] }`).
 *
 * @param attr - The ARIA attribute node to inspect.
 * @param role - The computed ARIA role of the element.
 * @param propSpecs - The list of ARIA property specifications for type lookup.
 * @returns A violation if the element-specific restriction disallows the property.
 */
export const checkingElementSupportsAriaProp: AttrChecker<
	boolean,
	Options,
	{
		role: ARIARole | null;
		propSpecs: readonly ARIAProperty[];
	}
> =
	({ attr, role, propSpecs }) =>
	t => {
		if (!/^aria-/i.test(attr.name)) {
			return;
		}

		const ariaVersion =
			attr.rule.options?.version ??
			attr.ownerMLDocument.ruleCommonSettings?.ariaVersion ??
			ARIA_RECOMMENDED_VERSION;
		const propSpec = propSpecs.find(p => p.name === attr.name);
		const elAriaSpec = getARIA(
			attr.ownerMLDocument.specs,
			attr.ownerElement.localName,
			attr.ownerElement.namespaceURI,
			ariaVersion,
			attr.ownerElement.matches.bind(attr.ownerElement),
		);

		// Spec data may set `properties: false` to forbid every aria-* attribute on
		// elements that have no implicit role and accept no explicit role
		// (e.g. `input[type=hidden]`). The role-based check (`role-supports-aria-prop`)
		// does not cover this because `role` is null for such elements.
		// Note: when an explicit `role=` is present, `role` is non-null and this
		// branch is skipped — but `permitted-roles` already rejects the
		// explicit role for elements whose spec says `permittedRoles: false`,
		// so the user sees a violation either way.
		if (!role && elAriaSpec?.properties === false) {
			return {
				scope: attr,
				message: t(
					'{0:c} on {1}',
					t(
						'{0} is {1:c}',
						t('the "{0*}" {1}', attr.name, `ARIA ${propSpec?.type ?? 'property'}`),
						'disallowed',
					),
					t('the "{0*}" {1}', attr.ownerElement.localName, 'element'),
				),
			};
		}

		// Spec data may set `properties: { only: [...] }` to whitelist a small
		// set of aria-* attributes (e.g. `<br>` / `<wbr>` accept only
		// `aria-hidden`). When the attribute is outside that whitelist, the
		// element-specific restriction overrides the role-derived check.
		//
		// The schema permits entries in either bare-name form (`"aria-hidden"`)
		// or name/value pair form (`{ name, value? }`). No html-spec entry
		// currently uses the value form, so we only key on the name. If the
		// value form becomes necessary later, mirror the value-matching path
		// already implemented in the `properties.without` branch below.
		if (elAriaSpec?.properties !== false && elAriaSpec?.properties?.only) {
			const onlyNames = elAriaSpec.properties.only.map(o => (typeof o === 'string' ? o : o.name));
			if (!onlyNames.includes(attr.name)) {
				return {
					scope: attr,
					message: t(
						'{0:c} on {1}',
						t(
							'{0} is {1:c}',
							t('the "{0*}" {1}', attr.name, `ARIA ${propSpec?.type ?? 'property'}`),
							'disallowed',
						),
						t('the "{0*}" {1}', attr.ownerElement.localName, 'element'),
					),
				};
			}
		}

		if (elAriaSpec?.properties !== false && elAriaSpec?.properties?.without) {
			for (const ignore of elAriaSpec.properties.without) {
				if (ignore.name === attr.name) {
					const hasNativeAttr =
						ignore.alt?.method === 'set-attr' && attr.ownerElement.hasAttribute(ignore.alt.target);

					return {
						scope: attr,
						message:
							t(
								'{0:c} on {1}',
								t(
									ignore.type === 'must-not'
										? '{0} must not {1}'
										: ignore.type === 'should-not'
											? '{0} should not {1}'
											: '{0} is not recommended to {1}',
									// {0}
									t('the "{0*}" {1}', attr.name, `ARIA ${propSpec?.type ?? 'property'}`),
									// {1}
									'use',
								),
								t('the "{0*}" {1}', attr.ownerElement.localName, 'element'),
							) +
							(hasNativeAttr
								? t('. ') +
									t(
										'As its {0} is already provided by {1}',
										t('state'),
										t('the "{0*}" {1}', ignore.alt.target, 'attribute'),
									)
								: ignore.alt
									? t('. ') +
										t(
											'{0} if you {1} {2}',
											t(
												ignore.alt.method === 'remove-attr' ? 'Remove {0}' : 'Add {0}',
												t('the "{0*}" {1}', ignore.alt.target, 'attribute'),
											),
											'use',
											t('the {0}', `ARIA ${propSpec?.type ?? 'property'}`),
										)
									: ''),
					};
				}
			}
		}
	};
