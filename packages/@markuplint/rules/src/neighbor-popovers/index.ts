import { createRule } from '@markuplint/ml-core';
import { mayBeFocusable } from '@markuplint/ml-spec';

// TODO: It will be received from config
const ARIA_VERSION = '1.2';

export default createRule({
	meta: {
		category: 'a11y',
	},
	verify({ document, report, t }) {
		const triggers = document.querySelectorAll('[popovertarget]');
		Triggers: for (const trigger of triggers) {
			const targetId = trigger.getAttribute('popovertarget');
			if (!targetId) {
				continue;
			}
			const target = document.getElementById(targetId);
			if (!target) {
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
						// Element has accessible name
						(node.getAccessibleName(ARIA_VERSION) ||
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
