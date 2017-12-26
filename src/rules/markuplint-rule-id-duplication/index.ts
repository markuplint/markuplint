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
	public name = 'id-duplication';

	public async verify (document: Document, config: RuleConfig, ruleset: Ruleset, locale: string) {
		const reports: VerifyReturn[] = [];
		const message = await messages(locale, 'Duplicate {0}', 'attribute id value');
		const idStack: string[] = [];
		await document.walk(async (node) => {
			if (node instanceof Element) {
				const id = node.id;
				if (id && id.value) {
					if (idStack.includes(id.value)) {
						reports.push({
							level: config.level,
							message,
							line: id.location.line,
							col: id.location.col,
							raw: id.raw,
						});
					}
					idStack.push(id.value);
				}
			}
		});
		return reports;
	}
}
