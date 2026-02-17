import { createRule } from '@markuplint/ml-core';

import meta from './meta.js';

/**
 * Rule that requires a dialog element referenced by a `show-modal` command
 * to contain a descendant (or itself) with the `autofocus` attribute.
 *
 * Without `autofocus`, the dialog element itself receives focus when shown
 * as a modal, which is not ideal for accessibility.
 */
export default createRule({
	defaultSeverity: 'warning',
	meta: meta,
	verify({ document, report, t }) {
		const triggers = document.querySelectorAll('button[command][commandfor]');

		for (const trigger of triggers) {
			const command = trigger.getAttribute('command');
			if (!command || command.toLowerCase() !== 'show-modal') {
				continue;
			}

			const targetId = trigger.getAttribute('commandfor');
			if (!targetId) {
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
