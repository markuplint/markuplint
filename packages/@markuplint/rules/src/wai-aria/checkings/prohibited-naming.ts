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
 * Checks the ARIA in HTML naming-prohibition constraint: elements with
 * `namingProhibited=true` must not use `aria-label` / `aria-labelledby` /
 * `aria-braillelabel` unless an explicit role that supports naming is set.
 * When `role` is null and the element is namingProhibited, the naming attrs
 * are prohibited.
 *
 * At time of writing, the affected elements (implicitRole=false +
 * namingProhibited=true in html-spec) are:
 *   abbr, cite, figcaption, kbd, label, legend, mark, rt, var
 * This list is not hard-coded here; it is derived from html-spec data.
 *
 * Autonomous custom elements (`<x-y>`, no `is=` attribute, no spec.<el>
 * entry) are treated the same way: ARIA in HTML §4.4 forbids naming
 * attrs unless an explicit role that supports naming is set. The
 * `elementType === 'web-component'` discriminator excludes
 * customised-built-in elements (`<button is="x-y">`) — those inherit
 * the host element's namingProhibited flag through the regular path.
 * `getComputedRole` returns null for custom elements even when a
 * `role=` attribute is set (it can't validate the role against an
 * unknown element's permittedRoles), so consult the raw attribute
 * directly to detect "an explicit role that supports naming is set".
 *
 * @param attr - The ARIA attribute node to inspect.
 * @param role - The computed ARIA role of the element.
 * @param propSpecs - The list of ARIA property specifications for type lookup.
 * @returns A violation if a naming attribute is used on a naming-prohibited element.
 */
export const checkingProhibitedNaming: AttrChecker<
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

		if (!NAMING_ATTRS.has(attr.name)) {
			return;
		}

		if (role) {
			return;
		}

		const ariaVersion =
			attr.rule.options?.version ??
			attr.ownerMLDocument.ruleCommonSettings?.ariaVersion ??
			ARIA_RECOMMENDED_VERSION;
		const elAriaSpec = getARIA(
			attr.ownerMLDocument.specs,
			attr.ownerElement.localName,
			attr.ownerElement.namespaceURI,
			ariaVersion,
			attr.ownerElement.matches.bind(attr.ownerElement),
		);

		const isAutonomousCustomElement =
			attr.ownerElement.elementType === 'web-component' && !attr.ownerElement.hasAttribute('is');
		const hasExplicitRoleAttr =
			isAutonomousCustomElement && (attr.ownerElement.getAttribute('role')?.trim() ?? '') !== '';

		if (hasExplicitRoleAttr) {
			return;
		}

		if (elAriaSpec?.namingProhibited !== true && !isAutonomousCustomElement) {
			return;
		}

		const propSpec = propSpecs.find(p => p.name === attr.name);
		return {
			scope: attr,
			message: t(
				'{0:c} on {1}',
				t('{0} is {1:c}', t('the "{0*}" {1}', attr.name, `ARIA ${propSpec?.type ?? 'property'}`), 'prohibited'),
				t('the "{0*}" {1}', attr.ownerElement.localName, 'element'),
			),
		};
	};
