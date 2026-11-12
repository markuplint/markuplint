import type { Options } from '../types.js';
import type { Element, ElementChecker, Block, ChildNode } from '@markuplint/ml-core';
import type { ARIARole, ARIAVersion } from '@markuplint/ml-spec';

import {
	ARIA_RECOMMENDED_VERSION,
	getComposedParentElement,
	getComputedRole,
	isRequiredOwnedElement,
	isSlotElement,
	isTransparentForOwnership,
} from '@markuplint/ml-spec';

import { expandChildren, isContentMutable } from '../../permitted-contents/slot-content.js';
import { noTranslate } from '../../no-translate.js';

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
 * For a shadow host, they are the elements of its declarative shadow root, which is
 * rendered in place of its light children (see `getOwnedChildNodes`).
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
		// Currently, only the child nodes (those of the shadow root for a shadow host) are checked.
		// Elements referenced via `aria-owns` should also be considered as owned elements per the
		// ARIA specification.

		const ariaVersion =
			el.rule.options?.version ?? el.ownerMLDocument.ruleCommonSettings?.ariaVersion ?? ARIA_RECOMMENDED_VERSION;
		const ownedChildNodes = getOwnedChildNodes(el);
		const children: OwnedElement[] = classifyChildren(el, ownedChildNodes, role, ariaVersion);

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
		if (isOwnedContentMutable(component)) {
			return;
		}

		if (mayBeBeforeCreated(ownedChildNodes ?? [])) {
			return {
				scope: component,
				message: t(
					'{0}. Or, {1}',
					t(
						'{0} requires {1}',
						t('the {0}', 'child element'),
						role.allowedAccessibilityChildRoles.length === 1 && role.allowedAccessibilityChildRoles[0]
							? t('the "{0*}" {1}', role.allowedAccessibilityChildRoles[0], 'role')
							: t('the {0}', 'roles') + `: ${t(role.allowedAccessibilityChildRoles.map(noTranslate))}`,
					),
					t('require {0*}', 'aria-busy="true"'),
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
					: t('the {0}', 'roles') + `: ${t(role.allowedAccessibilityChildRoles.map(noTranslate))}`,
			),
		};
	};

/**
 * Determines whether the owned child nodes may not yet exist (e.g., empty or
 * containing only `<script>` / `<template>` elements that could dynamically create content).
 *
 * @param childNodes - The child nodes the element owns (see `getOwnedChildNodes`).
 * @returns `true` if the nodes are empty or only contain script/template elements.
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
 * @param childNodes - The child nodes `el` owns, from `getOwnedChildNodes`.
 * @param role - The ARIA role of the parent, which defines allowed child roles.
 * @param version - The WAI-ARIA version for version-gated transparency behavior.
 * @returns An array of classified child nodes.
 */
function classifyChildren(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	el: Element<boolean, Options>,
	childNodes: readonly ChildNode<boolean, Options>[] | null,
	role: ARIARole,
	version: ARIAVersion,
): OwnedElement[] {
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
			if (isSlotElement(child)) {
				result.push(...classifySlot(child, role, version));
				continue;
			}
			/**
			 * The role of a child is resolved against its parent in the accessibility tree,
			 * which is the host for a child at the top of a declarative shadow root. A child
			 * that a pretender places somewhere other than under that parent (a node given at
			 * the usage site that the component renders inside its slot wrapper, or an element
			 * a fragment component renders in place) would be judged against the wrong parent
			 * and lose its role, so it is resolved on its own.
			 */
			const computedChild = getComputedRole(
				child.ownerMLDocument.specs,
				child,
				version,
				getComposedParentElement(child) !== el,
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
				const shadowRootTemplate = getShadowRootTemplate(child);
				if (shadowRootTemplate !== 'unknown' && isContentMutable(shadowRootTemplate ?? child, 'pretended')) {
					result.push([child, 'UNKNOWN']);
					continue;
				}
				result.push(...classifyChildren(child, getOwnedChildNodes(child), role, version));
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
 * Classifies what a `slot` that the owned elements are looked for through renders: the nodes assigned to
 * it, or its own children when none is, in its place. A slot is not an element of the accessibility tree.
 *
 * The slot is reached only through the elements that are transparent for ownership, so what it renders
 * is owned by the element as if it were written in place of the slot. A slot that is not reached (one
 * in a `p`, or in the content of a nested `template`) places nothing as an owned element, and is not
 * looked at. Where the assignment is not known (a slot that is not in a shadow root, a framework's, manual
 * assignment, template syntax among the light children), what it renders is not known: `UNKNOWN`.
 *
 * The light children assigned to the slot are not in the shadow root that the mutability gate reads
 * (`isOwnedContentMutable`), so the template syntax and the mutable attributes in them are looked at
 * here: a node that may not be what it is written as keeps the rule from deciding.
 *
 * > If slottables is the empty list, then append each slottable child of slot, in tree order, to slottables.
 *
 * @see https://dom.spec.whatwg.org/#find-flattened-slotables
 * @param slot - The `slot` element
 * @param role - The ARIA role of the owner, which defines allowed child roles.
 * @param version - The WAI-ARIA version for version-gated transparency behavior.
 * @returns The classified nodes the slot renders.
 */
function classifySlot(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	slot: Element<boolean, Options>,
	role: ARIARole,
	version: ARIAVersion,
): OwnedElement[] {
	const assigned = slot.getAssignedNodes();
	if (!assigned) {
		return [[slot, 'UNKNOWN']];
	}
	if (assigned.length === 0) {
		return classifyChildren(slot, getOwnedChildNodes(slot), role, version);
	}
	const mutable = assigned.some(
		node =>
			node.is(node.ELEMENT_NODE) &&
			(node.hasMutableAttributes() || node.hasMutableChildren(true, isFlattenedSlot)),
	);
	if (mutable) {
		return [[slot, 'UNKNOWN']];
	}
	return classifyChildren(slot, assigned, role, version);
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
 * A shadow host owns the child nodes of its declarative shadow root, of either mode, and
 * nothing else: the shadow root is rendered in place of the light children, which include
 * the `template` that declares it and what a pretended component renders itself. This
 * comes first, as ml-core attaches the root to a pretended host that renders the children
 * written in it in itself. A `template` written in a block or a `template` with a directive
 * may not be rendered, so `null` is returned for it (`getShadowRootTemplate`). The light children
 * are rendered only where a `slot` in the shadow root places them: the nodes assigned to it
 * (`MLElement#getAssignedNodes`) are classified in its place, and the light children that
 * no slot takes are not owned (`classifySlot`).
 *
 * `getRenderedChildNodes` of `@markuplint/ml-core` (the accessible name computation)
 * resolves the rendered children in the same order, but does not expand fragment
 * components.
 *
 * > […] the flat tree is the top-level DOM tree, but shadow hosts are filled with their shadow tree children instead of their light tree children […]
 *
 * @see https://drafts.csswg.org/css-shadow-1/#flattening
 * @param el - The element, or the virtual slot wrapper of a pretended component.
 * @returns The child nodes, or `null` when they cannot be known.
 */
function getOwnedChildNodes(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	el: Element<boolean, Options>,
): readonly ChildNode<boolean, Options>[] | null {
	// The content of the `template` is the shadow root, and holds the same nodes as its children.
	const shadowRootTemplate = getShadowRootTemplate(el);
	if (shadowRootTemplate === 'unknown') {
		return null;
	}
	if (shadowRootTemplate) {
		return expandChildren(shadowRootTemplate, [...shadowRootTemplate.childNodes], 'pretended');
	}

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

/**
 * Whether a `slot` is one that `classifyChildren` cannot see: a parser that makes the `slot` of its
 * framework a fragment (Vue, Astro) has it flattened out of the child nodes, and what it renders is
 * not known. Any other `slot` is classified where the owned elements reach it (`classifySlot`), and
 * one that is not reached places nothing as an owned element.
 *
 * @param slot - A `slot` element
 * @returns `true` if the slot is flattened out of the child nodes
 */
function isFlattenedSlot(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	slot: Element<boolean, Options>,
): boolean {
	return slot.isFragment;
}

/**
 * Whether the nodes `el` owns may be rendered by something the markup does not show:
 * template syntax, a mutable attribute or a component that no pretender resolved among them
 * (`hasMutableChildren`), or a pretender whose `contents` are unknown (`isContentMutable`).
 * For a shadow host they are read in the shadow root, as that is what it owns: a light
 * child that no `slot` places is not rendered, mutable or not.
 *
 * A `slot` is not counted here unless it is flattened out of the child nodes (`isFlattenedSlot`):
 * `classifySlot` reads what it renders where the owned elements are looked for through it, and a slot
 * that is not reached places nothing as an owned element.
 *
 * @param el - The element, or the component a virtual slot wrapper stands for.
 * @returns `true` when the owned nodes may differ from the markup.
 */
function isOwnedContentMutable(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	el: Element<boolean, Options>,
): boolean {
	const template = getShadowRootTemplate(el);
	if (template === 'unknown') {
		return true;
	}
	const scope = template ?? el;
	return scope.hasMutableChildren(true, isFlattenedSlot) || isContentMutable(scope, 'pretended');
}

/**
 * The `template` element whose content is the declarative shadow root of `host`, which ml-core
 * exposes without the element.
 *
 * ml-core finds the `template` through what a template engine renders away (a block, a
 * `template` with a directive such as `v-if`), as the id lookups need a tree either way. Such
 * a wrapper, or a conditional branch that leaves the `template` out, may render it or not,
 * and the host owns the shadow root or its light children accordingly. So what the host owns
 * is unknown unless the `template` is written right in the host and in every branch of its
 * children (`conditionalChildNodes`), and no block among them has a range that the syntax
 * tree does not give.
 *
 * @param host - An element.
 * @returns The `template` element; `'unknown'` when it is written in such a wrapper; `null`
 *   when no shadow root is attached to `host`.
 */
function getShadowRootTemplate(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	host: Element<boolean, Options>,
): Element<boolean, Options> | 'unknown' | null {
	const shadowRoot = host.declarativeShadowRoot;
	if (!shadowRoot) {
		return null;
	}
	// A block without a behavior may be a marker of a language whose blocks the syntax tree does
	// not nest (`{% if %}` … `{% endif %}`), so whether it encloses the `template` is not known.
	for (const child of host.getPureChildNodes()) {
		if (child.is(child.MARKUPLINT_PREPROCESSOR_BLOCK) && !child.blockBehavior) {
			return 'unknown';
		}
	}
	for (const child of host.childNodes) {
		if (child.is(child.ELEMENT_NODE) && child.content === shadowRoot) {
			if (child.syntacticalParentNode !== host) {
				return 'unknown';
			}
			const branches = host.conditionalChildNodes();
			return branches.every(branch => [...branch].includes(child)) ? child : 'unknown';
		}
	}
	return 'unknown';
}
