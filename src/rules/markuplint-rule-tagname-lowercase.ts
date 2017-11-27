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
 * `tagname-lowercase`
 *
 * *Core rule*
 */
export class TagnameLowercase extends Rule {
	public verify (document: Document, ruleset: Ruleset) {
		const reports: VerifiedReport[] = [];
		document.walk((node) => {
			if (node instanceof Element && node.namespaceURI === 'http://www.w3.org/1999/xhtml') {
				if (/[A-Z]/.test(node.nodeName)) {
					const line = node.line;
					const col = node.col;
					reports.push({
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

export default new TagnameLowercase('tagname-lowercase');
