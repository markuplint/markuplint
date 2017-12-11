import {
	Document,
	Element,
} from '../../parser';
import Rule, {
	RuleConfig,
	RuleLevel,
	VerifiedResult,
} from '../../rule';
import {
	PermittedContent,
	Ruleset,
} from '../../ruleset';
import messages from '../messages';

export type Value = 'double' | 'single';

const quote = {
	double: '"',
	single: "'",
};

export default class extends Rule<Value> {
	public name = 'attr-value-quotes';
	public defaultLevel: RuleLevel = 'warning';
	public defaultValue: Value = 'double';

	public async verify (document: Document, config: RuleConfig<Value>, ruleset: Ruleset, locale: string) {
		const reports: VerifiedResult[] = [];
		const message = await messages(locale, '{0} is must {1} on {2}', 'Attribute value', 'quote', `${config.value} quotation mark`);
		document.walk((node) => {
			if (node instanceof Element) {
				for (const attr of node.attributes) {
					if (attr.quote !== quote[config.value]) {
						reports.push({
							level: config.level,
							message,
							line: attr.location.line,
							col: attr.location.col,
							raw: attr.raw,
						});
					}
				}
			}
		});
		return reports;
	}
}
