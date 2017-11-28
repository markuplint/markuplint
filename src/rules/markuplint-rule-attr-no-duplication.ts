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
export class AttrValueDoubleQuotes extends Rule {
	public verify (document: Document, ruleset: Ruleset) {
		const reports: VerifiedReport[] = [];
		document.walk((node) => {
			if (node instanceof Element) {
				for (const attr of node.attributes) {
					const attrNameStack: string[] = [];
					for (const rawAttr of attr.rawAttr) {
						const attrName = rawAttr.name.toLowerCase();
						if (attrNameStack.includes(attrName)) {
							reports.push({
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

export default new AttrValueDoubleQuotes('attr-no-duplication');
