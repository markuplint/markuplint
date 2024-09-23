import { createRule } from '@markuplint/ml-core';
import { isNothingContentModel, isPalpableElement } from '@markuplint/ml-spec';

import meta from './meta.js';

type Options = {
	extendsExposableElements?: boolean;
	ignoreIfAriaBusy?: boolean;
};

const allowedElements = new Set([
	// These elements are possibly empty because it to be filled by user interaction.
	'textarea',
	'output',

	// Since the element itself is palpable, there is no need to determine whether its content is empty.
	'audio',
	'canvas',
	'video',
	'img',
]);

export default createRule<boolean, Options>({
	meta: meta,
	defaultSeverity: 'warning',
	defaultOptions: {
		extendsExposableElements: true,
		ignoreIfAriaBusy: true,
	},
	async verify({ document, report, t }) {
		await document.walkOn('Element', el => {
			if (allowedElements.has(el.localName)) {
				return;
			}

			if (
				!isPalpableElement(el, el.ownerMLDocument.specs, {
					extendsSvg: false,
					extendsExposableElements: el.rule.options.extendsExposableElements,
				})
			) {
				return;
			}

			if (isNothingContentModel(el)) {
				return;
			}

			if (el.rule.options.ignoreIfAriaBusy && el.getAttribute('aria-busy') === 'true') {
				return;
			}

			const isEmpty = [...el.childNodes].every(node => node.is(node.TEXT_NODE) && node.isWhitespace());

			if (isEmpty) {
				report({
					scope: el,
					message: t('{0} should not {1}', t('the {0}', 'element'), 'empty'),
				});
			}
		});
	},
});
