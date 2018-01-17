import {
	Document,
	Element,
	InvalidNode,
	OmittedElement,
} from '../../parser';
import Rule, {
	RuleConfig,
	VerifyReturn,
} from '../../rule';
import Ruleset from '../../ruleset';
import messages from '../messages';

export type DefaultValue = string;
export interface Options {}

export default class extends Rule<DefaultValue, Options> {
	public name = 'parse-error';

	public async verify (document: Document<DefaultValue, Options>, config: RuleConfig<DefaultValue, Options>, ruleset: Ruleset, locale: string) {
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
				if (hasBody && node.raw.indexOf('<body') === 0) {
					reports.push({
						level: config.level,
						message: '"body"要素はDOMツリー上に既に暗黙的に生成されています。',
						line: node.line,
						col: node.col,
						raw: node.raw,
					});
				} else {
					reports.push({
						level: config.level,
						message: 'パースできない不正なノードです。',
						line: node.line,
						col: node.col,
						raw: node.raw,
					});
				}
			}
		});
		return reports;
	}
}
