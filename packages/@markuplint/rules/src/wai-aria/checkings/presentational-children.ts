import type { Options } from '../types.js';
import type { Element, ElementChecker } from '@markuplint/ml-core';
import type { ComputedRole } from '@markuplint/ml-spec';

import { ARIA_RECOMMENDED_VERSION, getComputedRole } from '@markuplint/ml-spec';

/**
 * Checks whether ARIA attributes are applied to descendants of an element whose
 * role has the `childrenArePresentational` characteristic.
 *
 * Presentational Children
 *
 * @see https://www.w3.org/TR/wai-aria/#childrenArePresentational
 * @see https://w3c.github.io/aria/#childrenArePresentational
 *
 * > The DOM descendants are presentational.
 * > user agents SHOULD NOT expose descendants of
 * > this element through the platform accessibility API.
 * > If user agents do not hide the descendant nodes,
 * > some information may be read twice.
 *
 * @see https://w3c.github.io/aria/#tree_exclusion
 *
 * > Any descendants of elements that have the characteristic "Children Presentational: True"
 * > unless the descendant is not allowed to be presentational
 * > because it meets one of the conditions for exception described
 * > in Presentational Roles Conflict Resolution.
 * > However, the text content of any excluded descendants is included.
 *
 * @see https://w3c.github.io/aria/#tree_inclusion
 *
 * > Text equivalents for hidden referenced objects
 * > may still be used in the name and description computation
 * > even when not included in the accessibility tree.
 *
 * @param el - The element node to inspect for presentational ancestor context.
 * @returns A violation if the element has ARIA attributes and an ancestor with presentational children.
 */
export const checkingPresentationalChildren: ElementChecker<boolean, Options> =
	({ el }) =>
	t => {
		const ancestor = getAncestorHasPresentationalChildren(el);
		if (!ancestor) {
			return;
		}
		if (!ancestor.role) {
			return;
		}
		const hasAriaAttr = [...el.attributes].some(attr => /^aria-|^role$/i.test(attr.name));
		if (!hasAriaAttr) {
			return;
		}
		return {
			scope: el,
			message: t(
				'it may be ineffective because {0}',
				t(
					"it has {0} as an ancestor that doesn't expose its descendants to the accessibility tree",
					t('the "{0*}" {1}', ancestor.role.name, 'role'),
				),
			),
		};
	};

/**
 * Traverses the element's ancestor chain to find one whose computed role
 * has the `childrenArePresentational` characteristic.
 *
 * @param el - The element to start searching from (exclusive, starts from parent).
 * @returns The computed role of the ancestor with presentational children, or `null` if none found.
 */
function getAncestorHasPresentationalChildren(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	el: Element<boolean, Options>,
): ComputedRole | null {
	const ariaVersion =
		el.rule.options?.version ?? el.ownerMLDocument.ruleCommonSettings?.ariaVersion ?? ARIA_RECOMMENDED_VERSION;
	let current: Element<boolean, Options> | null = el.parentElement;
	while (current) {
		const computed = getComputedRole(el.ownerMLDocument.specs, current, ariaVersion);
		if (computed.role?.childrenPresentational) {
			return computed;
		}
		current = current.parentElement;
	}
	return null;
}
