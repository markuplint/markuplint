import { createRule, isPretenderDeclaredElement } from '@markuplint/ml-core';

import { getElementByIdInTree } from '../helpers.js';

import meta from './meta.js';

/**
 * Without `autofocus`, the browser's dialog focusing steps fall back to the
 * `<dialog>` element itself, which is not ideal for accessibility — screen
 * reader users may miss the dialog content, and keyboard users may need
 * extra tab presses to reach interactive elements.
 *
 * A `dialog` that a pretender declares (`isPretenderDeclaredElement` of `@markuplint/ml-core`) is not
 * judged: its content is not declared, so an element with `autofocus` may be in it.
 *
 * @see https://html.spec.whatwg.org/multipage/interactive-elements.html#dialog-focusing-steps
 * @see https://html.spec.whatwg.org/multipage/interactive-elements.html#the-dialog-element
 * @see https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/
 */
export default createRule({
	defaultSeverity: 'warning',
	meta: meta,
	verify({ document, report, t }) {
		// The dialog is looked for in the tree of the trigger, so the triggers of every tree are checked
		const triggers = document.deepQuerySelectorAll('button[command][commandfor]');
		const reportedDialogs = new Set<object>();

		for (const trigger of triggers) {
			const command = trigger.getAttribute('command');
			if (!command || command.toLowerCase() !== 'show-modal') {
				continue;
			}

			const targetId = trigger.getAttribute('commandfor');
			if (!targetId) {
				continue;
			}

			const target = getElementByIdInTree(
				trigger,
				targetId,
				trigger.getAttributeNode('commandfor')?.isExpressionValue,
			);
			// What a pretender declares has no content declared, so an element with `autofocus` may be in it
			if (!target || isPretenderDeclaredElement(target)) {
				continue;
			}

			if (reportedDialogs.has(target)) {
				continue;
			}

			if (target.localName !== 'dialog') {
				continue;
			}

			if (target.hasAttribute('autofocus')) {
				continue;
			}

			const autofocusDescendants = target.querySelectorAll('[autofocus]');
			if (autofocusDescendants.length > 0) {
				continue;
			}

			reportedDialogs.add(target);
			report({
				scope: target,
				message: t(
					'The "{0*}" element referenced by a "{1*}" command requires an element with the "{2*}" attribute',
					'dialog',
					'show-modal',
					'autofocus',
				),
			});
		}
	},
});
