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
	public name = 'attr-duplication';

	public async verify (document: Document, config: RuleConfig, ruleset: Ruleset, locale: string) {
		const reports: VerifiedResult[] = [];
		const message = await messages(locale, 'Duplicate {0}', 'attribute name');
		document.walk((node) => {
			if (node instanceof Element) {
				for (const attr of node.attributes) {
					const attrNameStack: string[] = [];
					for (const rawAttr of attr.rawAttr) {
						const attrName = rawAttr.name.toLowerCase();
						if (attrNameStack.includes(attrName)) {
							reports.push({
								level: this.defaultLevel,
								message,
								line: rawAttr.line,
								col: rawAttr.col,
								raw: rawAttr.raw,
							});
						} else {
							attrNameStack.push(attrName);
						}
					}
				}
			}
		});
		return reports;
	}
}
