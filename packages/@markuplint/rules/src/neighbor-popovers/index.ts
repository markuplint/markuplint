import { createRule } from '@markuplint/ml-core';
import { ARIA_RECOMMENDED_VERSION, mayBeFocusable } from '@markuplint/ml-spec';

import meta from './meta.js';

export default createRule({
	meta: meta,
	verify({ document, report, t }) {
		const ariaVersion = document.ruleCommonSettings?.ariaVersion ?? ARIA_RECOMMENDED_VERSION;

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
