import {
	Document,
	Element,
	InvalidNode,
	Node,
	TextNode,
} from '../parser';
import Rule, {
	VerifiedReport,
} from '../rule';
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
		const reports: VerifiedReport[] = [];
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
							const line = node.line;
							const col = 1;
							reports.push({
								message: 'Expected spaces. Indentaion is required tabs.',
								line,
								col,
								raw: `${lastNode.textContent}${node}`,
							});
						}
					}
					if (typeof rule === 'number') {
						if (!/^ +$/.test(spaces)) {
							const line = node.line;
							const col = 1;
							reports.push({
								message: 'Expected spaces. Indentaion is required spaces.',
								line,
								col,
								raw: `${lastNode.textContent}${node}`,
							});
						} else if (spaces.length % rule) {
							const line = node.line;
							const col = 1;
							reports.push({
								message: `Expected spaces. Indentaion is required ${rule} width spaces.`,
								line,
								col,
								raw: `${lastNode.textContent}${node}`,
							});
						}
					}
				}
			}
			lastNode = node;
		});
		return reports;
	}
}

export default new Indentation('indentation');
