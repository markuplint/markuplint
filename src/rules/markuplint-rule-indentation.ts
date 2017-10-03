import {
	Document,
	Element,
	InvalidNode,
	Node,
	TextNode,
} from '../parser';
import Rule from '../rule';
import {
	PermittedContent,
	Ruleset,
} from '../ruleset';

/**
 * `Indentation`
 *
 * *Core rule*
 */
export class Indentation extends Rule {
	public verify (document: Document, ruleset: Ruleset) {
		const reports: string[] = [];
		let lastNode: Node;
		document.walk((node) => {
			if (lastNode instanceof TextNode) {
				const hasBreakAndIndent = /^\s+|\s+$/.test(lastNode.textContent);
				if (hasBreakAndIndent) {
					// TODO: firstElement is not detect
					console.log({t: lastNode.textContent, next: `${node.nodeName}`});
				}
			}
			lastNode = node;
		});
		return reports;
	}
}

export default new Indentation('indentation');
