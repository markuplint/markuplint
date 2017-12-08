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

export default class extends Rule {
	public name = 'attr-duplication';

	public async verify (document: Document, config: RuleConfig, ruleset: Ruleset) {
		const reports: VerifiedResult[] = [];
		document.walk((node) => {
			if (node instanceof Element) {
				for (const attr of node.attributes) {
					const attrNameStack: string[] = [];
					for (const rawAttr of attr.rawAttr) {
						const attrName = rawAttr.name.toLowerCase();
						if (attrNameStack.includes(attrName)) {
							reports.push({
								level: this.defaultLevel,
								message: 'Duplication of attribute.',
								line: rawAttr.line + node.line,
								col: rawAttr.line === 0 ? rawAttr.col + node.col - 1 : rawAttr.col,
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
