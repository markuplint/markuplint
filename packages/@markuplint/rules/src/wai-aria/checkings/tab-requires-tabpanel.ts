import type { Options } from '../types.js';
import type { ElementChecker } from '@markuplint/ml-core';
import type { ARIARole } from '@markuplint/ml-spec';

import { ARIA_RECOMMENDED_VERSION, getComputedRole } from '@markuplint/ml-spec';
import { getDOMValue, getElementByIdInTree, querySelectorAllInTree } from '../../helpers.js';

/**
 * Checks that an active `tab` role element has a corresponding `tabpanel` role element.
 *
 * The correspondence is resolved the same way ARIA in HTML authors are expected to
 * express it: the tab's `aria-controls` idref list points to a `tabpanel`, or some
 * `tabpanel` element's `aria-labelledby` idref list points back at the tab's own `id`.
 *
 * > Authors MUST ensure that if a tab is active, a corresponding tabpanel that represents the active tab is rendered.
 *
 * @see https://w3c.github.io/aria/#tab
 * @param el - The element node to inspect.
 * @param role - The computed ARIA role of the element.
 * @returns A violation if the active tab has no corresponding tabpanel.
 */
export const checkingTabRequiresTabpanel: ElementChecker<
	boolean,
	Options,
	{
		role?: ARIARole | null;
	}
> =
	({ el, role }) =>
	t => {
		if (role?.name !== 'tab') {
			return;
		}

		const selectedAttr = el.getAttributeNode('aria-selected');
		if (!selectedAttr || selectedAttr.isDynamicValue || selectedAttr.value !== 'true') {
			return;
		}

		const document = el.ownerMLDocument;
		const ariaVersion =
			el.rule.options?.version ?? document.ruleCommonSettings?.ariaVersion ?? ARIA_RECOMMENDED_VERSION;

		const isTabpanel = (candidate: typeof el) =>
			getComputedRole(document.specs, candidate, ariaVersion).role?.name === 'tabpanel';

		const controlsAttr = el.getAttributeNode('aria-controls');
		if (controlsAttr && !controlsAttr.isDynamicValue) {
			const hasControlledTabpanel = controlsAttr.value
				.split(/\s+/)
				.filter(Boolean)
				.some(id => {
					const target = getElementByIdInTree(el, id, controlsAttr.isExpressionValue);
					return !!target && isTabpanel(target);
				});
			if (hasControlledTabpanel) {
				return;
			}
		}

		// The tabpanel refers to the tab in the tree of the tab, and the ids are compared as the DOM has them
		const tabId = getDOMValue(el.getAttributeNode('id'));
		if (tabId != null) {
			const hasLabellingTabpanel = querySelectorAllInTree(el, '[aria-labelledby]').some(candidate => {
				const labelledbyAttr = candidate.getAttributeNode('aria-labelledby');
				if (!labelledbyAttr || labelledbyAttr.isDynamicValue) return false;
				return (
					labelledbyAttr.value
						.split(/\s+/)
						.map(id => getDOMValue(labelledbyAttr, id))
						.includes(tabId) && isTabpanel(candidate)
				);
			});
			if (hasLabellingTabpanel) {
				return;
			}
		}

		return {
			scope: el,
			message: t(
				'{0} requires {1}',
				t('an active "{0*}" {1}', 'tab', 'role'),
				t('a corresponding "{0*}" {1}', 'tabpanel', 'role'),
			),
		};
	};
