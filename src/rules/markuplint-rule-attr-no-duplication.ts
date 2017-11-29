import {
	Document,
	Element,
} from '../parser';
import Rule, {
	RuleConfig,
	VerifiedReport,
} from '../rule';
import {
	PermittedContent,
	Ruleset,
} from '../ruleset';

/**
 * `attr-value-double-quotes`
 *
 * *Core rule*
 */
export default class extends Rule {
	public name = 'attr-no-duplication';

	public verify (document: Document, config: RuleConfig, ruleset: Ruleset) {
		const reports: VerifiedReport[] = [];
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
