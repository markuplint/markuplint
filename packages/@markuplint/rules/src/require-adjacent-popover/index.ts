import { createRule } from '@markuplint/ml-core';
import { ARIA_RECOMMENDED_VERSION, mayBeFocusable } from '@markuplint/ml-spec';

import { getElementByIdInTree } from '../helpers.js';

import meta from './meta.js';

/**
 * Command values from the Invoker Commands API that relate to popover behavior.
 * Comparison is case-insensitive per the HTML spec.
 */
const POPOVER_COMMANDS = new Set(['toggle-popover', 'show-popover', 'hide-popover']);

export default createRule({
	meta: meta,
	defaultSeverity: 'warning',
	verify({ document, report, t }) {
		const ariaVersion = document.ruleCommonSettings?.ariaVersion ?? ARIA_RECOMMENDED_VERSION;

		// The target is looked for in the tree of the trigger, so the triggers of every tree are checked
		const triggers = document.deepQuerySelectorAll('[popovertarget], [commandfor]');
		Triggers: for (const trigger of triggers) {
			let targetId: string | null = null;

			const popovertarget = trigger.getAttrValue('popovertarget');
			if (popovertarget) {
				targetId = popovertarget;
			} else {
				const command = trigger.getAttrValue('command');
				if (command && POPOVER_COMMANDS.has(command.toLowerCase())) {
					targetId = trigger.getAttrValue('commandfor');
				}
			}

			if (!targetId) {
				continue;
			}
			const target = getElementByIdInTree(
				trigger,
				targetId,
				trigger.getAttrNode(popovertarget ? 'popovertarget' : 'commandfor')?.isExpressionValue,
			);
			if (!target) {
				continue;
			}
			if (!target.hasAttr('popover')) {
				continue;
			}

			const subsequentNodes = trigger.findSubsequentNodes();

			for (const node of subsequentNodes) {
				if (node === target) {
					continue Triggers;
				}
				if (
					(node.is(node.ELEMENT_NODE) &&
						// Element has accessible name
						(node.getAccessibleName(ariaVersion) ||
							// Element is focusable
							mayBeFocusable(node, node.ownerMLDocument.specs))) ||
					(node.is(node.TEXT_NODE) &&
						// Text node has non-whitespace characters
						node.nodeValue?.trim())
				) {
					report({
						scope: node,
						message: t(
							'Detected {0} between {1} and {2}',
							t('perceptible nodes'),
							t('the {0}', 'trigger'),
							t('corresponding {0}', 'target'),
						),
					});
					continue Triggers;
				}
			}
		}
	},
});
