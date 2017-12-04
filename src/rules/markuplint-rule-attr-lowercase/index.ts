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

/**
 * `attr-lowercase`
 *
 * *Core rule*
 */
export default class extends Rule {
	public name = 'attr-lowercase';

	public verify (document: Document, config: RuleConfig, ruleset: Ruleset) {
		const reports: VerifiedResult[] = [];
		document.walk((node) => {
			if (node instanceof Element && node.namespaceURI === 'http://www.w3.org/1999/xhtml') {
				if (node.attributes) {
					for (const attr of node.attributes) {
						const attrOffset = attr.startOffset - node.startOffset;
						const distance = attr.endOffset - attr.startOffset;
						const rawAttr = node.raw.substr(attrOffset, distance);
						const rawAttrName = rawAttr.split('=')[0].trim();
						if (/[A-Z]/.test(rawAttrName)) {
							const line = node.line;
							const col = node.col;
							reports.push({
								level: this.defaultLevel,
								message: 'HTMLElement attribute name must be lowercase',
								line: attr.line,
								col: attr.col,
								raw: rawAttr,
							});
						}
					}
				}
			}
		});
		return reports;
	}
}
