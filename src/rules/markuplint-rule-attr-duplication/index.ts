import {
	Document,
	Element,
} from '../../parser';
import Rule, {
	RuleConfig,
	VerifyReturn,
} from '../../rule';
import Ruleset, {
	PermittedContent,
} from '../../ruleset';
import messages from '../messages';


export default class extends Rule {
	public name = 'attr-duplication';

	public async verify (document: Document, config: RuleConfig, ruleset: Ruleset, locale: string) {
		const reports: VerifyReturn[] = [];
		const message = await messages(locale, 'Duplicate {0}', 'attribute name');
		await document.walk(async (node) => {
			if (node instanceof Element) {
				const attrNameStack: string[] = [];
				for (const attr of node.attributes) {
					const attrName = attr.name.toLowerCase();
					if (attrNameStack.includes(attrName)) {
						reports.push({
							level: config.level,
							message,
							line: attr.location.line,
							col: attr.location.col,
							raw: attr.raw,
						});
					} else {
						attrNameStack.push(attrName);
					}
				}
			}
		});
		return reports;
	}
}
