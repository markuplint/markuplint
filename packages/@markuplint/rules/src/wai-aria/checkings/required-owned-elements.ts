import type { Options } from '../types';
import type { ElementChecker } from '@markuplint/ml-core';
import type { ARIARole } from '@markuplint/ml-spec';

import { getComputedRole, isRequiredOwnedElement } from '@markuplint/ml-spec';

/**
 * Required Owned Elements
 *
 * @see https://w3c.github.io/aria/#mustContain
 */
export const checkingRequiredOwnedElements: ElementChecker<
	boolean,
	Options,
	{
		role?: ARIARole | null;
	}
> =
	({ el, role }) =>
	t => {
		if (!role) {
			return;
		}
		if (!role.requiredOwnedElements.length) {
			return;
		}
		/**
		 * > There may be times that required owned elements are missing,
		 * > for example, while editing or while loading a data set.
		 * > When a widget is missing required owned elements due to script execution or loading,
		 * > authors MUST mark a containing element with aria-busy equal to true.
		 * > For example, until a page is fully initialized and complete,
		 * > an author could mark the document element as busy.
		 *
		 * Stop to evaluate when it has `aria-busy=true` for it considers the contents are missing.
		 */
		if (el.matches('[aria-busy="true" i]')) {
			return;
		}

		// TODO: Needs to resolve `aria-own`

		if (!el.children.length) {
			return {
				scope: el,
				message: t(
					'{0}. Or, {1}',
					t('Require {0} to content', t('the {0*} {1}', t(role.requiredOwnedElements), 'role')),
					t('require {0}', 'aria-busy="true"'),
				),
			};
		}
		const children: ('REQUIRED' | 'PB' | 'OTHER' | 'NO_ELEMENT')[] = Array.from(el.childNodes).map(child => {
			if (child.is(child.ELEMENT_NODE)) {
				const computedChild = getComputedRole(child.ownerMLDocument.specs, child, child.rule.option.version);
				if (
					role.requiredOwnedElements.some(ownedRole =>
						isRequiredOwnedElement(
							computedChild,
							ownedRole,
							child.ownerMLDocument.specs,
							child.rule.option.version,
						),
					)
				) {
					return 'REQUIRED';
				}
				return 'OTHER';
			} else if (child.MARKUPLINT_PREPROCESSOR_BLOCK) {
				return 'PB';
			}
			return 'NO_ELEMENT';
		});
		if (children.includes('PB')) {
			return {
				scope: el,
				message: t(
					'{0} expects {1}',
					t('the "{0*}" {1}', role.name, 'role'),
					t(role.requiredContextRole.map(ownedRole => t('the "{0*}" {1}', ownedRole, 'role'))),
				),
			};
		}
		if (!children.includes('REQUIRED')) {
			return {
				scope: el,
				message: t(
					'{0} expects {1}',
					t('the "{0*}" {1}', role.name, 'role'),
					t('the {0*} {1}', t(role.requiredOwnedElements), 'roles'),
				),
			};
		}
	};
