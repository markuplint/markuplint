import type { Options } from '../types.js';
import type { Element, ElementChecker } from '@markuplint/ml-core';
import type { ComputedRole } from '@markuplint/ml-spec';

import { getComputedRole } from '@markuplint/ml-spec';

/**
 * Checks whether ARIA attributes are applied to descendants of an element whose
 * role has the `childrenArePresentational` characteristic.
 *
 * Roles such as `img` and `progressbar` mark their DOM descendants as presentational,
 * meaning user agents should not expose them to the accessibility API. Setting ARIA
 * attributes on such descendants is likely ineffective.
 *
 * @see https://www.w3.org/TR/wai-aria/#childrenArePresentational
 * @see https://w3c.github.io/aria/#childrenArePresentational
 * @see https://w3c.github.io/aria/#tree_exclusion
 * @see https://w3c.github.io/aria/#tree_inclusion
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
	let current: Element<boolean, Options> | null = el.parentElement;
	while (current) {
		const computed = getComputedRole(el.ownerMLDocument.specs, current, el.rule.options.version);
		if (computed.role?.childrenPresentational) {
			return computed;
		}
		current = current.parentElement;
	}
	return null;
}
