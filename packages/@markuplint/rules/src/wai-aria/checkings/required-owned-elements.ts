import type { Options } from '../types.js';
import type { Element, ElementChecker, Block } from '@markuplint/ml-core';
import type { ARIARole, ARIAVersion } from '@markuplint/ml-spec';

import {
	ARIA_RECOMMENDED_VERSION,
	getComputedRole,
	isRequiredOwnedElement,
	isTransparentForOwnership,
} from '@markuplint/ml-spec';

/**
 * Represents a classified child node when checking required owned elements.
 *
 * - `REQUIRED`: the child fulfills one of the role's required owned element roles.
 * - `BUSY`: the child has `aria-busy="true"`, indicating content is still loading.
 * - `OTHER`: the child is an element but does not satisfy any required owned role.
 * - `PB`: the child is a preprocessor block (template syntax), which may produce required elements.
 * - `NO_ELEMENT`: the child is not an element node (e.g., text or comment).
 */
type OwnedElement =
	| [node: Element<boolean, Options>, type: 'REQUIRED' | 'BUSY' | 'OTHER']
	| [node: Block<boolean, Options>, type: 'PB']
	| [node: null, type: 'NO_ELEMENT'];

/**
 * Checks whether an element with a role that has "Allowed Accessibility Child Roles"
 * (called "Required Owned Elements" in ARIA 1.2) actually contains children
 * with the expected roles.
 *
 * For example, a `list` role must own at least one element with the `listitem` role.
 * This checker respects `aria-busy="true"` (which signals that content is still loading),
 * preprocessor blocks, and mutable children from template engines.
 *
 * @see https://w3c.github.io/aria/#mustContain
 * @param el - The element node to inspect for allowed accessibility child roles.
 * @param role - The computed ARIA role of the element, which defines allowed accessibility child roles.
 * @returns A violation if the role requires owned elements and none are found.
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
		if (role.allowedAccessibilityChildRoles.length === 0) {
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

		// TODO: Needs to resolve `aria-owns` references to include virtually owned elements.
		// Currently, only DOM-tree children are checked. Elements referenced via `aria-owns`
		// should also be considered as owned elements per the ARIA specification.

		const ariaVersion =
			el.rule.options?.version ?? el.ownerMLDocument.ruleCommonSettings?.ariaVersion ?? ARIA_RECOMMENDED_VERSION;
		const children: OwnedElement[] = classifyChildren(el, role, ariaVersion);

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
						role.allowedAccessibilityChildRoles.length === 1 && role.allowedAccessibilityChildRoles[0]
							? t('the "{0*}" {1}', role.allowedAccessibilityChildRoles[0], 'role')
							: t('the {0}', 'roles') + `: ${t(role.allowedAccessibilityChildRoles)}`,
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
				role.allowedAccessibilityChildRoles.length === 1 && role.allowedAccessibilityChildRoles[0]
					? t('the "{0*}" {1}', role.allowedAccessibilityChildRoles[0], 'role')
					: t('the {0}', 'roles') + `: ${t(role.allowedAccessibilityChildRoles)}`,
			),
		};
	};

/**
 * Determines whether the element's children may not yet exist (e.g., empty or
 * containing only `<script>` / `<template>` elements that could dynamically create content).
 *
 * @param el - The element to inspect.
 * @returns `true` if the element is empty or only contains script/template children.
 */
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

/**
 * Classifies the child nodes of an element for "Allowed Accessibility Child Roles" validation.
 *
 * In ARIA 1.3, elements whose computed role is transparent for ownership
 * (e.g., `generic`) are traversed recursively so that their descendants
 * are evaluated as if they were direct children of the owning element.
 *
 * @param el - The parent element whose children to classify.
 * @param role - The ARIA role of the parent, which defines allowed child roles.
 * @param version - The WAI-ARIA version for version-gated transparency behavior.
 * @returns An array of classified child nodes.
 */
function classifyChildren(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	el: Element<boolean, Options>,
	role: ARIARole,
	version: ARIAVersion,
): OwnedElement[] {
	const result: OwnedElement[] = [];
	for (const child of el.childNodes) {
		if (child.is(child.ELEMENT_NODE)) {
			if (child.matches('[aria-busy="true" i]')) {
				result.push([child, 'BUSY']);
				continue;
			}
			const computedChild = getComputedRole(child.ownerMLDocument.specs, child, version);
			if (
				role.allowedAccessibilityChildRoles.some(ownedRole =>
					isRequiredOwnedElement(
						computedChild.el,
						computedChild.role,
						ownedRole,
						child.ownerMLDocument.specs,
						version,
					),
				)
			) {
				result.push([child, 'REQUIRED']);
				continue;
			}
			if (isTransparentForOwnership(computedChild.role?.name, version)) {
				result.push(...classifyChildren(child, role, version));
				continue;
			}
			result.push([child, 'OTHER']);
		} else if (child.is(child.MARKUPLINT_PREPROCESSOR_BLOCK)) {
			result.push([child, 'PB']);
		} else {
			result.push([null, 'NO_ELEMENT']);
		}
	}
	return result;
}
