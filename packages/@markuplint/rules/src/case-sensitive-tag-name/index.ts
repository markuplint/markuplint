import { createRule } from '@markuplint/ml-core';

export type Value = 'lower' | 'upper';

export default createRule<Value, null>({
	name: 'case-sensitive-tag-name',
	defaultLevel: 'warning',
	defaultValue: 'lower',
	defaultOptions: null,
	async verify(context) {
		await context.document.walk(async node => {
			if ('fixNodeName' in node) {
				if (node.isForeignElement || node.isCustomElement || node.type === 'OmittedElement') {
					return;
				}
				const ms = node.rule.severity === 'error' ? 'must' : 'should';
				const deny = node.rule.value === 'lower' ? /[A-Z]/ : /[a-z]/;
				const message = context.translate(
					`{0} of {1} ${ms} be {2}`,
					'Tag name',
					'HTML elements',
					`${node.rule.value}case`,
				);
				if (deny.test(node.nodeName)) {
					const loc = node.getNameLocation();
					context.report({
						scope: node,
						message,
						line: loc.line,
						col: loc.col,
						raw: node.nodeName,
					});
				}
			}
		});
	},
	async fix({ document }) {
		await document.walk(async node => {
			if ('fixNodeName' in node) {
				if (node.isForeignElement || node.isCustomElement) {
					return;
				}
				const deny = node.rule.value === 'lower' ? /[A-Z]/ : /[a-z]/;
				if (deny.test(node.nodeName)) {
					if (node.rule.value === 'lower') {
						node.fixNodeName(node.nodeName.toLowerCase());
					} else {
						node.fixNodeName(node.nodeName.toUpperCase());
					}
				}
			}
		});
	},
});
