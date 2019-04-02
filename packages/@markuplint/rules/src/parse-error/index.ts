import { Element, InvalidNode, OmittedElement, Result, createRule } from '@markuplint/ml-core';

export default createRule({
	name: 'parse-error',
	defaultLevel: 'error',
	defaultValue: null,
	defaultOptions: null,
	async verify(document, messages) {
		const reports: Result[] = [];
		// const message = await messages(`Values allowed for {0} attributes are {$}`, '"role"');
		let hasBody = false;
		await document.walk(async node => {
			if (node instanceof Element || node instanceof OmittedElement) {
				if (node.nodeName.toLowerCase() === 'body') {
					hasBody = true;
				}
			}
			if (node instanceof InvalidNode) {
				if (hasBody && node.raw.indexOf('<body') === 0) {
					reports.push({
						severity: node.rule.severity,
						message: '"body"要素はDOMツリー上に既に暗黙的に生成されています。',
						line: node.startLine,
						col: node.startCol,
						raw: node.raw,
					});
				} else {
					reports.push({
						severity: node.rule.severity,
						message: 'パースできない不正なノードです。',
						line: node.startLine,
						col: node.startCol,
						raw: node.raw,
					});
				}
			}
		});
		return reports;
	},
});
