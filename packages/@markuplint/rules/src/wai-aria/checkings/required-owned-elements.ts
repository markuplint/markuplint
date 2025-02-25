import type { Options } from '../types.js';
import type { Element, ElementChecker, Block } from '@markuplint/ml-core';
import type { ARIARole } from '@markuplint/ml-spec';

import { ARIA_RECOMMENDED_VERSION, getComputedRole, isRequiredOwnedElement } from '@markuplint/ml-spec';

type OwnedElement =
	| [node: Element<boolean, Options>, type: 'REQUIRED' | 'BUSY' | 'OTHER']
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
		if (role.requiredOwnedElements.length === 0) {
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

		const children: OwnedElement[] = [...el.childNodes].map<OwnedElement>(child => {
			if (child.is(child.ELEMENT_NODE)) {
				if (child.matches('[aria-busy="true" i]')) {
					return [child, 'BUSY'];
				}

				const ariaVersion =
					child.rule.options?.version ??
					child.ownerMLDocument.ruleCommonSettings.ariaVersion ??
					ARIA_RECOMMENDED_VERSION;
				const computedChild = getComputedRole(child.ownerMLDocument.specs, child, ariaVersion);
				if (
					role.requiredOwnedElements.some(ownedRole =>
						isRequiredOwnedElement(
							computedChild.el,
							computedChild.role,
							ownedRole,
							child.ownerMLDocument.specs,
							ariaVersion,
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

		if (children.some(([, type]) => type === 'BUSY')) {
			return;
		}

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

		/**
		 * Has mutable children
		 *
		 * Ex:
		 *
		 * ```jsx
		 * <table>
		 *   <tbody>
		 *     {list.map((item) => <tr><td>{item}</td></tr>)}
		 *   </tbody>
		 * </table>
		 * ```
		 */
		if (el.hasMutableChildren(true)) {
			return;
		}

		if (mayBeBeforeCreated(el)) {
			return {
				scope: el,
				message: t(
					'{0}. Or, {1}',
					t(
						'{0} requires {1}',
						t('the {0}', 'child element'),
						role.requiredOwnedElements.length === 1 && role.requiredOwnedElements[0]
							? t('the "{0*}" {1}', role.requiredOwnedElements[0], 'role')
							: t('the {0}', 'roles') + `: ${t(role.requiredOwnedElements)}`,
					),
					t('require {0}', 'aria-busy="true"'),
				),
			};
		}

		return {
			scope: el,
			message: t(
				'{0} expects {1}',
				t('the "{0*}" {1}', role.name, 'role'),
				role.requiredOwnedElements.length === 1 && role.requiredOwnedElements[0]
					? t('the "{0*}" {1}', role.requiredOwnedElements[0], 'role')
					: t('the {0}', 'roles') + `: ${t(role.requiredOwnedElements)}`,
			),
		};
	};

function mayBeBeforeCreated(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	el: Element<boolean, Options>,
) {
	if (el.isEmpty()) {
		return true;
	}

	return [...el.children].every(child => {
		return ['script', 'template'].includes(child.localName);
	});
}
