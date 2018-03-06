import Element from '../../dom/element';
import InvalidNode from '../../dom/invalid-node';
import OmittedElement from '../../dom/omitted-element';

import { VerifyReturn } from '../../rule';
import CustomRule from '../../rule/custom-rule';

export type Value = 'tab' | number;

export default CustomRule.create({
	name: 'parse-error',
	defaultValue: null,
	defaultOptions: null,
	async verify (document, messages) {
		const reports: VerifyReturn[] = [];
		// const message = await messages(`Values allowed for {0} attributes are {$}`, '"role"');
		let hasBody = false;
		await document.walk(async (node) => {
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
						line: node.line,
						col: node.col,
						raw: node.raw,
					});
				} else {
					reports.push({
						severity: node.rule.severity,
						message: 'パースできない不正なノードです。',
						line: node.line,
						col: node.col,
						raw: node.raw,
					});
				}
			}
		});
		return reports;
	},
});
