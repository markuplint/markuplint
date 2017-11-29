import {
	Document,
	Element,
} from '../parser';
import Rule, {
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
	public name = 'attr-value-double-quotes';

	public verify (document: Document, ruleset: Ruleset) {
		const reports: VerifiedReport[] = [];
		document.walk((node) => {
			if (node instanceof Element) {
				for (const attr of node.attributes) {
					for (const rawAttr of attr.rawAttr) {
						if (rawAttr.quote !== '"') {
							reports.push({
								level: this.defaultLevel,
								message: 'Attribute value is must quote on double',
								line: rawAttr.line + node.line,
								col: rawAttr.line === 0 ? rawAttr.col + node.col - 1 : rawAttr.col,
								raw: rawAttr.raw,
							});
						}
					}
				}
			}
		});
		return reports;
	}
}
