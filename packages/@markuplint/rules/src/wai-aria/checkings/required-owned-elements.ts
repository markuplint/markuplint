import type { Options } from '../types.js';
import type { Element, ElementChecker, Block, ChildNode } from '@markuplint/ml-core';
import type { ARIARole, ARIAVersion } from '@markuplint/ml-spec';

import {
	ARIA_RECOMMENDED_VERSION,
	getComputedRole,
	isRequiredOwnedElement,
	isTransparentForOwnership,
} from '@markuplint/ml-spec';

import { expandChildren, isContentMutable } from '../../permitted-contents/slot-content.js';

/**
 * Represents a classified child node when checking required owned elements.
 *
 * - `REQUIRED`: the child fulfills one of the role's required owned element roles.
 * - `BUSY`: the child has `aria-busy="true"`, indicating content is still loading.
 * - `OTHER`: the child is an element but does not satisfy any required owned role.
 * - `PB`: the child is a preprocessor block (template syntax), which may produce required elements.
 * - `UNKNOWN`: the element is a pretended component whose rendered children cannot be known.
 * - `NO_ELEMENT`: the child is not an element node (e.g., text or comment).
 */
type OwnedElement =
	| [node: Element<boolean, Options>, type: 'REQUIRED' | 'BUSY' | 'OTHER' | 'UNKNOWN']
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
 * For a pretended component, the owned elements are the ones the component renders
 * itself (`contents`) together with the children given to it, not the usage site alone.
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

		if (children.some(([, type]) => type === 'BUSY' || type === 'UNKNOWN')) {
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
		// A virtual slot wrapper stands for the component, whose nodes are the ones given to it.
		const component = el.pretenderContext?.type === 'origin' ? el.pretenderContext.origin : el;
		if (component.hasMutableChildren(true) || isContentMutable(component, 'pretended')) {
			return;
		}

		if (mayBeBeforeCreated(getOwnedChildNodes(el) ?? [])) {
			return {
				scope: component,
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
			scope: component,
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
function mayBeBeforeCreated(childNodes: readonly ChildNode<boolean, Options>[]) {
	if (childNodes.every(child => child.is(child.TEXT_NODE) && child.textContent?.trim() === '')) {
		return true;
	}

	return childNodes
		.filter(child => child.is(child.ELEMENT_NODE))
		.every(child => ['script', 'template'].includes(child.localName));
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
	const childNodes = getOwnedChildNodes(el);
	if (!childNodes) {
		return [[el, 'UNKNOWN']];
	}
	const result: OwnedElement[] = [];
	for (const child of childNodes) {
		if (child.is(child.ELEMENT_NODE)) {
			if (child.matches('[aria-busy="true" i]')) {
				result.push([child, 'BUSY']);
				continue;
			}
			/**
			 * The role of a child is resolved against its DOM parent. A child that a pretender
			 * places somewhere other than under its DOM parent (a node given at the usage site
			 * that the component renders inside its slot wrapper, or an element a fragment
			 * component renders in place) would be judged against the wrong parent and lose
			 * its role, so it is resolved on its own.
			 */
			const computedChild = getComputedRole(
				child.ownerMLDocument.specs,
				child,
				version,
				child.parentElement !== el,
			);
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
				if (isContentMutable(child, 'pretended')) {
					result.push([child, 'UNKNOWN']);
					continue;
				}
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

/**
 * The child nodes that `el` owns as the page renders them.
 *
 * For a pretended component this is what the component renders, not what is written
 * at the usage site: the nodes it renders itself (`contents`) around the nodes given
 * to it, `slotContent.fill(given)`. The nodes "given" are `as.childNodes`, which is
 * empty when the component never renders its children (`slots: null`).
 *
 * - A single slot wrapper that differs from the outermost element sits between them:
 *   the outermost element owns the wrapper, and the wrapper owns the filled nodes.
 * - Several slot wrappers leave the owner of each node unknown, so `null` is returned
 *   and nothing is claimed about the element.
 *
 * @param el - The element, or the virtual slot wrapper of a pretended component.
 * @returns The child nodes, or `null` when they cannot be known.
 */
function getOwnedChildNodes(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	el: Element<boolean, Options>,
): readonly ChildNode<boolean, Options>[] | null {
	const context = el.pretenderContext;

	if (context?.type === 'pretender') {
		const wrapper = context.slotContent?.wrapper;
		if (wrapper === null) {
			return null;
		}
		if (wrapper && wrapper !== context.as) {
			return [wrapper];
		}
		return expandChildren(el, [...context.as.childNodes], 'pretended');
	}

	// The virtual slot wrapper has no child nodes of its own.
	if (context?.type === 'origin') {
		const origin = context.origin;
		const originContext = origin.pretenderContext;
		if (originContext?.type === 'pretender' && originContext.slotContent?.wrapper === el) {
			return expandChildren(origin, [...originContext.as.childNodes], 'pretended');
		}
	}

	return expandChildren(el, [...el.childNodes], 'pretended');
}
