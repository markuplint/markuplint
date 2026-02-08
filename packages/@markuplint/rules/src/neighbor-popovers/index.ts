import { createRule } from '@markuplint/ml-core';
import { mayBeFocusable } from '@markuplint/ml-spec';

import meta from './meta.js';

// TODO: It will be received from config
/** The ARIA specification version used for accessible name computation. */
const ARIA_VERSION = '1.2';

/**
 * Rule that detects perceptible content between a popover trigger and its target.
 *
 * When a `[popovertarget]` element and its corresponding `[popover]` target exist
 * in the DOM, any focusable elements, elements with accessible names, or non-whitespace
 * text nodes between them are reported as violations.
 */
export default createRule({
	meta: meta,
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
