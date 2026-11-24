import { createRule, isPretenderDeclaredElement } from '@markuplint/ml-core';
import { ARIA_RECOMMENDED_VERSION, mayBeFocusable } from '@markuplint/ml-spec';

import { getElementByIdInTree } from '../helpers.js';

import meta from './meta.js';

/**
 * Command values from the Invoker Commands API that relate to popover behavior.
 * Comparison is case-insensitive per the HTML spec.
 */
const POPOVER_COMMANDS = new Set(['toggle-popover', 'show-popover', 'hide-popover']);

/**
 * A popover that a pretender declares (`isPretenderDeclaredElement` of `@markuplint/ml-core`) is not
 * judged: it is in no list of the nodes that follow the trigger, and where the component renders it
 * among them is not known.
 */
export default createRule({
	meta: meta,
	defaultSeverity: 'warning',
	verify({ document, report, t }) {
		const ariaVersion = document.ruleCommonSettings?.ariaVersion ?? ARIA_RECOMMENDED_VERSION;

		// The target is looked for in the tree of the trigger, so the triggers of every tree are checked
		const triggers = document.deepQuerySelectorAll('[popovertarget], [commandfor]');
		Triggers: for (const trigger of triggers) {
			let targetId: string | null = null;

			const popovertarget = trigger.getAttribute('popovertarget');
			if (popovertarget) {
				targetId = popovertarget;
			} else {
				const command = trigger.getAttribute('command');
				if (command && POPOVER_COMMANDS.has(command.toLowerCase())) {
					targetId = trigger.getAttribute('commandfor');
				}
			}

			if (!targetId) {
				continue;
			}
			const target = getElementByIdInTree(
				trigger,
				targetId,
				trigger.getAttributeNode(popovertarget ? 'popovertarget' : 'commandfor')?.isExpressionValue,
			);
			// What a pretender declares is in no list of subsequent nodes, and where the component renders it
			// among them is not known, so adjacency is not decided against it
			if (!target || isPretenderDeclaredElement(target)) {
				continue;
			}
			if (!target.hasAttribute('popover')) {
				continue;
			}

			const subsequentNodes = trigger.findSubsequentNodes();

			for (const node of subsequentNodes) {
				if (node === target) {
					continue Triggers;
				}
				if (
					(node.is(node.ELEMENT_NODE) &&
						// Element has accessible name. As written is enough: a name in a branch of a conditional
						// block comes from text or an element in the branch, and that node is itself found among the
						// subsequent nodes.
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
