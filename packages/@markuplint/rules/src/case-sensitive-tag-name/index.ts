import { createRule, Result } from '@markuplint/ml-core';
import { MLDOMElement, MLDOMElementCloseTag } from '@markuplint/ml-core/lib/ml-dom/tokens';

export type Value = 'lower' | 'upper';

export default createRule<Value, null>({
	name: 'case-sensitive-tag-name',
	defaultLevel: 'warning',
	defaultValue: 'lower',
	defaultOptions: null,
	async verify(document, messages) {
		const reports: Result[] = [];
		await document.walk(async node => {
			if (node instanceof MLDOMElement || node instanceof MLDOMElementCloseTag) {
				if (node.isForeignElement) {
					return;
				}
				const ms = node.rule.severity === 'error' ? 'must' : 'should';
				const deny = node.rule.value === 'lower' ? /[A-Z]/ : /[a-z]/;
				const message = messages(
					`{0} of {1} ${ms} be {2}`,
					'Tag name',
					'HTML element',
					`${node.rule.value}case`,
				);
				if (deny.test(node.nodeName)) {
					reports.push({
						severity: node.rule.severity,
						message,
						line: node.startLine,
						col:
							node instanceof MLDOMElement
								? node.startCol + 1 // remove "<" char.
								: node.startCol + 2, // remove "</" char.
						raw: node.nodeName,
					});
				}
			}
		});
		return reports;
	},
	// async fix(document) {
	// 	await document.walk(async node => {
	// 		if (node instanceof Element || node instanceof ElementCloseTag) {
	// 			if (node.isForeignElement) {
	// 				return;
	// 			}
	// 			const deny = node.rule.value === 'lower' ? /[A-Z]/ : /[a-z]/;
	// 			if (deny.test(node.nodeName)) {
	// 				if (node.rule.value === 'lower') {
	// 					node.nodeName = node.nodeName.toLowerCase();
	// 				} else {
	// 					node.nodeName = node.nodeName.toUpperCase();
	// 				}
	// 			}
	// 		}
	// 	});
	// },
});
