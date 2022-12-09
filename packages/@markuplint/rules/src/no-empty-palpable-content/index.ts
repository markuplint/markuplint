import { createRule } from '@markuplint/ml-core';
import { isNothingContentModel, isPalpableElement } from '@markuplint/ml-spec';

type Options = {
	extendsExposableElements?: boolean;
	ignoreIfAriaBusy?: boolean;
};

export default createRule<boolean, Options>({
	defaultSeverity: 'warning',
	defaultOptions: {
		extendsExposableElements: true,
		ignoreIfAriaBusy: true,
	},
	async verify({ document, report, t }) {
		await document.walkOn('Element', el => {
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

			const isEmpty = Array.from(el.childNodes).every(node => node.is(node.TEXT_NODE) && node.isWhitespace());

			if (isEmpty) {
				report({
					scope: el,
					message: t('{0} should not {1}', t('the {0}', 'element'), 'empty'),
				});
			}
		});
	},
});
