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
	public name = 'deprecated-element';

	public async verify (document: Document, config: RuleConfig<DefaultValue, Options>, ruleset: Ruleset, locale: string) {
		const reports: VerifyReturn[] = [];
		const message = await messages(locale, `{0} is {1}`, 'Element', 'deprecated');
		await document.walkOn('Element', async (node) => {
			if (!ruleset.nodeRules) {
				return;
			}
			for (const nodeRule of ruleset.nodeRules) {
				if (nodeRule.tagName === node.nodeName) {
					if (nodeRule.obsolete) {
						reports.push({
							level: config.level,
							message,
							line: node.line,
							col: node.col + 1,
							raw: node.nodeName,
						});
					}
				}
			}
		});
		return reports;
	}
}
