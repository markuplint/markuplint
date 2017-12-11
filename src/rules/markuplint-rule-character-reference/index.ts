import {
	Document,
	TextNode,
} from '../../parser';
import Rule, {
	RuleConfig,
	VerifiedResult,
} from '../../rule';
import {
	Ruleset,
} from '../../ruleset';
import findLocation from '../../util/findLocation';
import messages from '../messages';

export type Value = boolean;

export interface Options {}

const defaultChars = [
	'"',
	'&',
	'<',
	'>',
];

export default class extends Rule<Value, Options> {
	public name = 'character-reference';

	public async verify (document: Document, config: RuleConfig<Value, Options>, ruleset: Ruleset, locale: string) {
		const reports: VerifiedResult[] = [];
		const ms = config.level === 'error' ? 'must' : 'should';
		const message = await messages(locale, `{0} ${ms} be {1}`, 'Illegal characters in node or attribute value', 'escape in character reference');
		let i = 0;
		document.walk((node) => {
			if (node instanceof TextNode) {
				findLocation(defaultChars, node.raw, node.line, node.col).forEach((foundLocation) => {
					reports.push({
						level: config.level,
						message,
						line: foundLocation.line,
						col: foundLocation.col,
						raw: foundLocation.raw,
					});
				});
			}
		});
		return reports;
	}
}
