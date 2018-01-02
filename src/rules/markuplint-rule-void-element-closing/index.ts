import {
	Document,
} from '../../parser';
import Rule, {
	RuleConfig,
	VerifyReturn,
} from '../../rule';
import Ruleset from '../../ruleset';
import messages from '../messages';

export type DefaultValue = null;
export interface Options {}

export default class extends Rule<DefaultValue, Options> {
	public name = 'void-element-closing';
	public defaultLevel: 'error' | 'warning' = 'warning';

	public async verify (document: Document, config: RuleConfig<DefaultValue, Options>, ruleset: Ruleset, locale: string) {
		const reports: VerifyReturn[] = [];
		const message = await messages(locale, `空要素に閉じスラッシュがあります`);
		await document.walkOn('Element', async (node) => {
			// console.log(node);
			// console.log(node.nodeName, node.endTagNode, node.endTagLocation);
			const hasEndTag = !!node.endTagLocation;
			if (!hasEndTag) {
				if (/\/>$/.test(node.raw)) {
					reports.push({
						level: this.defaultLevel,
						message,
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
