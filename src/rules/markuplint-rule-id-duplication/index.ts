import {
	Document,
	Element,
} from '../../parser';
import Rule, {
	RuleConfig,
	VerifiedResult,
} from '../../rule';
import {
	PermittedContent,
	Ruleset,
} from '../../ruleset';
import messages from '../messages';


export default class extends Rule {
	public name = 'id-duplication';

	public async verify (document: Document, config: RuleConfig, ruleset: Ruleset, locale: string) {
		const reports: VerifiedResult[] = [];
		const message = await messages(locale, 'Duplicate {0}', 'attribute id value');
		const idStack: string[] = [];
		document.walk((node) => {
			if (node instanceof Element) {
				const id = node.id;
				if (id) {
					if (idStack.includes(id.name)) {
						reports.push({
							level: this.defaultLevel,
							message,
							line: id.line,
							col: id.col,
							raw: id.raw,
						});
					}
					idStack.push(id.name);
				}
			}
		});
		return reports;
	}
}
