import Element from '../../dom/element';
import InvalidNode from '../../dom/invalid-node';
import OmittedElement from '../../dom/omitted-element';

import { VerifyReturn } from '../../rule';
import CustomRule from '../../rule/custom-rule';
import messages from '../messages';

export type Value = 'tab' | number;

export default CustomRule.create({
	name: 'parse-error',
	defaultValue: null,
	defaultOptions: null,
	async verify (document, locale) {
		const reports: VerifyReturn[] = [];
		// const message = await messages(locale, `Values allowed for {0} attributes are {$}`, '"role"');
		let hasBody = false;
		await document.walk(async (node) => {
			if (node instanceof Element || node instanceof OmittedElement) {
				if (node.nodeName.toLowerCase() === 'body') {
					hasBody = true;
				}
			}
			if (node instanceof InvalidNode) {
				if (!node.rule) {
					return;
				}
				if (hasBody && node.raw.indexOf('<body') === 0) {
					reports.push({
						level: node.rule.level,
						message: '"body"要素はDOMツリー上に既に暗黙的に生成されています。',
						line: node.line,
						col: node.col,
						raw: node.raw,
					});
				} else {
					reports.push({
						level: node.rule.level,
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
