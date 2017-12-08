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
 * `case-sensitive-tag-name`
 *
 * *Core rule*
 */
export default class extends Rule {
	public name = 'case-sensitive-tag-name';

	public async verify (document: Document, config: RuleConfig, ruleset: Ruleset) {
		const reports: VerifiedResult[] = [];
		document.walk((node) => {
			if (node instanceof Element && node.namespaceURI === 'http://www.w3.org/1999/xhtml') {
				if (/[A-Z]/.test(node.nodeName)) {
					const line = node.line;
					const col = node.col;
					reports.push({
						level: this.defaultLevel,
						message: 'HTMLElement name must be lowercase',
						line: node.line,
						col: node.col,
						raw: node.raw,
					});
				}
			}
		});
		return reports;
	}
}
