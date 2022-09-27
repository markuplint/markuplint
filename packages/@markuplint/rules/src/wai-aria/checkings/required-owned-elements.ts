import type { Options } from '../types';
import type { Element, ElementChecker, Block } from '@markuplint/ml-core';
import type { ARIARole } from '@markuplint/ml-spec';

import { getComputedRole, isRequiredOwnedElement } from '@markuplint/ml-spec';

type OwnedElement =
	| [node: Element<boolean, Options>, type: 'REQUIRED' | 'OTHER']
	| [node: Block<boolean, Options>, type: 'PB']
	| [node: null, type: 'NO_ELEMENT'];

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

		if (el.isEmpty()) {
			return {
				scope: el,
				message: t(
					'{0}. Or, {1}',
					t('require {0}', t('the "{0*}" {1}', t(role.requiredOwnedElements), 'role')),
					t('require {0}', 'aria-busy="true"'),
				),
			};
		}

		const children: OwnedElement[] = Array.from(el.childNodes).map<OwnedElement>(child => {
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
					return [child, 'REQUIRED'];
				}
				return [child, 'OTHER'];
			} else if (child.is(child.MARKUPLINT_PREPROCESSOR_BLOCK)) {
				return [child, 'PB'];
			}
			return [null, 'NO_ELEMENT'];
		});

		/**
		 * > Any element that will be owned by the element with this role.
		 * > For example, an element with the role list
		 * > **will own at least one element** with the role listitem.
		 */
		if (children.some(([, type]) => type === 'REQUIRED')) {
			return;
		}

		if (children.some(([, type]) => type === 'PB')) {
			// TODO: https://github.com/markuplint/markuplint/issues/490
			return;
		}

		return {
			scope: el,
			message: t(
				'{0} expects {1}',
				t('the "{0*}" {1}', role.name, 'role'),
				t('the "{0*}" {1}', t(role.requiredOwnedElements), 'roles'),
			),
		};
	};
