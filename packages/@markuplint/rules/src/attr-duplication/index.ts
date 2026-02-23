import { createRule } from '@markuplint/ml-core';

import { removeAttr } from '../helpers.js';

import meta from './meta.js';

/**
 * Rule that checks for duplicate attributes on the same element.
 *
 * Walks all elements and reports when two or more attributes share the same
 * name (case-insensitive for HTML elements). Attributes marked as duplicatable
 * (e.g., template-engine directives) are excluded from this check.
 */
export default createRule({
	meta: meta,
	async verify({ document, report, t }) {
		const message = t('{0} is {1:c}', t('the {0}', 'attribute name'), 'duplicated');
		await document.walkOn('Element', node => {
			const attrNameStack: string[] = [];
			for (const attr of node.getAttributeTokens()) {
				if (attr.isDuplicatable) {
					continue;
				}
				const attrName = attr.name;
				const name = node.elementType === 'html' ? attrName.toLowerCase() : attrName;
				if (attrNameStack.includes(name)) {
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
					attrNameStack.push(name);
				}
			}
		});
	},
});
