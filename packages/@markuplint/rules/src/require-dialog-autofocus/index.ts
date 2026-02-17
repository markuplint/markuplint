import { createRule } from '@markuplint/ml-core';

import meta from './meta.js';

/**
 * Rule that requires a `<dialog>` element referenced by a `show-modal` command
 * to contain a descendant (or itself) with the `autofocus` attribute.
 *
 * Without `autofocus`, the browser's dialog focusing steps fall back to the
 * `<dialog>` element itself, which is not ideal for accessibility — screen
 * reader users may miss the dialog content, and keyboard users may need
 * extra tab presses to reach interactive elements.
 *
 * Detection algorithm:
 * 1. Find all `<button>` elements with both `command` and `commandfor` attributes
 * 2. Filter to triggers whose `command` value is `show-modal` (case-insensitive)
 * 3. Resolve the referenced `<dialog>` via `document.getElementById(commandfor)`
 * 4. Skip non-dialog targets and already-reported dialogs (deduplication)
 * 5. Report if neither the dialog nor any descendant has the `autofocus` attribute
 *
 * @see https://html.spec.whatwg.org/multipage/interactive-elements.html#dialog-focusing-steps
 * @see https://html.spec.whatwg.org/multipage/interactive-elements.html#the-dialog-element
 * @see https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/
 */
export default createRule({
	defaultSeverity: 'warning',
	meta: meta,
	verify({ document, report, t }) {
		const triggers = document.querySelectorAll('button[command][commandfor]');
		const reportedDialogIds = new Set<string>();

		for (const trigger of triggers) {
			const command = trigger.getAttribute('command');
			if (!command || command.toLowerCase() !== 'show-modal') {
				continue;
			}

			const targetId = trigger.getAttribute('commandfor');
			if (!targetId) {
				continue;
			}

			if (reportedDialogIds.has(targetId)) {
				continue;
			}

			const target = document.getElementById(targetId);
			if (!target) {
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

			reportedDialogIds.add(targetId);
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
