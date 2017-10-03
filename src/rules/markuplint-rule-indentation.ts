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
				const matched = lastNode.textContent.match(/\n(\s+$)/);
				if (matched) {
					const spaces = matched[1];
					if (!spaces) {
						throw new TypeError(`Expected error.`);
					}
					const rule = ruleset.rules.indentation;
					if (rule === 'tab') {
						if (!/^\t+$/.test(spaces)) {
							const line = lastNode.line + 1;
							const col = lastNode.textContent.lastIndexOf(spaces);
							reports.push(`Expected spaces. Indentaion is required tabs. (${line}:${col})`);
						}
					}
					// console.log({t: lastNode.textContent, next: `${node.nodeName}`});
				}
			}
			lastNode = node;
		});
		return reports;
	}
}

export default new Indentation('indentation');
