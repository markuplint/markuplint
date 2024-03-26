import { createRule } from '@markuplint/ml-core';

import meta from './meta.js';

const controlSelector = ["input:not([type='hidden' i])", 'select', 'textarea'].join(',');

export default createRule({
	meta: meta,
	defaultSeverity: 'warning',
	async verify({ document, report, t }) {
		await document.walkOn('Element', el => {
			if (el.localName !== 'label') {
				return;
			}

			if (el.children.length === 0 && !el.hasAttribute('for')) {
				report({
					scope: el,
					message: t(
						'{0} should associate with {1}',
						t('The "{0*}" {1}', 'label', 'element'),
						t('a {0}', 'control'),
					),
				});
			}

			const controls = el.querySelectorAll(controlSelector);
			const secondControl = controls[1];
			if (secondControl) {
				report({
					scope: secondControl,
					message: t(
						'{0} associates only {1}',
						t('The "{0*}" {1}', 'label', 'element'),
						t('first {0}', 'control'),
					),
				});
			}
		});
	},
});
