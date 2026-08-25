import type { Options } from '../types.js';
import type { AttrChecker } from '@markuplint/ml-core';
import type { ARIAProperty, ARIARole } from '@markuplint/ml-spec';

import { ARIA_RECOMMENDED_VERSION, getARIA } from '@markuplint/ml-spec';

/**
 * ARIA naming attributes subject to the "naming prohibition" constraint
 * defined by ARIA in HTML.
 *
 * @see https://w3c.github.io/html-aria/#dfn-naming-prohibited
 */
const NAMING_ATTRS = new Set(['aria-label', 'aria-labelledby', 'aria-braillelabel']);

/**
 * Checks whether an ARIA property or state is disallowed on the element's computed role.
 *
 * Each ARIA role defines a set of supported states and properties. This checker reports
 * usage of ARIA attributes that are not in that set. It also considers element-specific
 * restrictions from the ARIA in HTML specification (e.g., properties that should not
 * be used on certain native HTML elements, and naming prohibition for elements with
 * no implicit role such as `<cite>` or `<abbr>`).
 *
 * @param attr - The ARIA attribute node to inspect.
 * @param role - The computed ARIA role of the element.
 * @param propSpecs - The list of ARIA property specifications for type lookup.
 * @param disallowSetImplicitProps - Whether to also enforce element-specific restrictions.
 * @returns A violation if the property is not allowed on the given role or element.
 */
export const checkingDisallowedProp: AttrChecker<
	boolean,
	Options,
	{
		role: ARIARole | null;
		propSpecs: readonly ARIAProperty[];
		disallowSetImplicitProps: boolean;
	}
> =
	({ attr, role, propSpecs, disallowSetImplicitProps }) =>
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

		// Naming prohibition (ARIA in HTML): elements with namingProhibited=true
		// must not use aria-label / aria-labelledby / aria-braillelabel unless
		// an explicit role that supports naming is set. When `role` is null and
		// the element is namingProhibited, the naming attrs are prohibited.
		// At time of writing, the affected elements (implicitRole=false +
		// namingProhibited=true in html-spec) are:
		//   abbr, cite, figcaption, kbd, label, legend, mark, rt, var
		// This list is not hard-coded here; it is derived from html-spec data.
		//
		// Autonomous custom elements (`<x-y>`, no `is=` attribute, no spec.<el>
		// entry) are treated the same way: ARIA in HTML §4.4 forbids naming
		// attrs unless an explicit role that supports naming is set. The
		// `elementType === 'web-component'` discriminator excludes
		// customised-built-in elements (`<button is="x-y">`) — those inherit
		// the host element's namingProhibited flag through the regular path.
		// `getComputedRole` returns null for custom elements even when a
		// `role=` attribute is set (it can't validate the role against an
		// unknown element's permittedRoles), so consult the raw attribute
		// directly to detect "an explicit role that supports naming is set".
		const isAutonomousCustomElement =
			attr.ownerElement.elementType === 'web-component' && !attr.ownerElement.hasAttribute('is');
		const hasExplicitRoleAttr =
			isAutonomousCustomElement && (attr.ownerElement.getAttribute('role')?.trim() ?? '') !== '';
		if (
			!role &&
			!hasExplicitRoleAttr &&
			NAMING_ATTRS.has(attr.name) &&
			(elAriaSpec?.namingProhibited === true || isAutonomousCustomElement)
		) {
			return {
				scope: attr,
				message: t(
					'{0:c} on {1}',
					t(
						'{0} is {1:c}',
						t('the "{0*}" {1}', attr.name, `ARIA ${propSpec?.type ?? 'property'}`),
						'prohibited',
					),
					t('the "{0*}" {1}', attr.ownerElement.localName, 'element'),
				),
			};
		}

		// Spec data may set `properties: false` to forbid every aria-* attribute on
		// elements that have no implicit role and accept no explicit role
		// (e.g. `input[type=hidden]`). The role-based check below would skip such
		// elements because `role` is null, so handle that case here.
		// Note: when an explicit `role=` is present, `role` is non-null and this
		// branch is skipped — but `permitted-roles` already rejects the
		// explicit role for elements whose spec says `permittedRoles: false`,
		// so the user sees a violation either way.
		//
		// Design note on the gating asymmetry: naming prohibition (above) fires
		// unconditionally because it is a hard ARIA-in-HTML rule, whereas this
		// `properties: false` branch is gated on `disallowSetImplicitProps` to
		// match the `properties.without` check below — both encode element-
		// specific aria-* prohibitions that users may want to opt out of.
		if (!role && disallowSetImplicitProps && elAriaSpec?.properties === false) {
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
		// element-specific restriction overrides the role-derived check. Like
		// the `properties: false` branch above this is gated on
		// `disallowSetImplicitProps` so users can opt out of the element-level
		// prohibition.
		//
		// The schema permits entries in either bare-name form (`"aria-hidden"`)
		// or name/value pair form (`{ name, value? }`). No html-spec entry
		// currently uses the value form, so we only key on the name. If the
		// value form becomes necessary later, mirror the value-matching path
		// already implemented in the `properties.without` branch below.
		if (disallowSetImplicitProps && elAriaSpec?.properties !== false && elAriaSpec?.properties?.only) {
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

		if (!role) {
			return;
		}
		const statesAndProp = role.ownedProperties.find(p => p.name === attr.name);

		if (disallowSetImplicitProps && elAriaSpec?.properties !== false && elAriaSpec?.properties?.without) {
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
		if (statesAndProp) {
			return;
		}
		return {
			scope: attr,
			message: t(
				'{0:c} on {1}',
				t('{0} is {1:c}', t('the "{0*}" {1}', attr.name, `ARIA ${propSpec?.type ?? 'property'}`), 'disallowed'),
				t('the "{0*}" {1}', role.name, 'role'),
			),
		};
	};
