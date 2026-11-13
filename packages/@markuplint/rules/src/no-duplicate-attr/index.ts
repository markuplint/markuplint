import { createRule } from '@markuplint/ml-core';

import { removeAttr } from '../helpers.js';

import meta from './meta.js';

export default createRule({
	meta: meta,
	async verify({ document, report, t }) {
		const message = t('{0} is {1:c}', t('the {0}', 'attribute name'), 'duplicated');
		await document.walkOn('Element', node => {
			const keyStack: string[] = [];
			for (const attr of node.getAttributeTokens()) {
				// A directive is not an attribute of the DOM, so the name that it resolves to says nothing of a
				// repeat: the framework tells it by the key that it keeps of the name as written, which
				// `MLAttr#duplicateKey` is, and for an attribute of the DOM it is the name that the DOM gives.
				const key = attr.duplicateKey;
				if (key === null) {
					continue;
				}
				if (keyStack.includes(key)) {
					const scope = attr.nameNode ?? attr;
					report({
						scope: {
							rule: node.rule,
							startLine: scope.startLine,
							startCol: scope.startCol,
							raw: scope.raw,
						},
						message,
						fix: fixer => removeAttr(fixer, attr),
					});
				} else {
					keyStack.push(key);
				}
			}
		});
	},
});
