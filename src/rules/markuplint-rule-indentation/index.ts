import {
	Document,
	Element,
	InvalidNode,
	Node,
	TextNode,
} from '../../parser';
import Rule, {
	RuleConfig,
	VerifiedResult,
} from '../../rule';
import {
	PermittedContent,
	Ruleset,
} from '../../ruleset';

export type DefaultValue = 'tab' | number;

/**
 * `Indentation`
 *
 * *Core rule*
 */
export default class extends Rule<DefaultValue> {
	public name = 'indentation';

	public async verify (document: Document, config: RuleConfig<DefaultValue>, ruleset: Ruleset) {
		const reports: VerifiedResult[] = [];
		let lastNode: Node;
		document.walk((node) => {
			if (lastNode instanceof TextNode) {
				const matched = lastNode.textContent.match(/\n(\s+$)/);
				if (matched) {
					const spaces = matched[1];
					if (!spaces) {
						throw new TypeError(`Expected error.`);
					}
					if (config.value === 'tab') {
						if (!/^\t+$/.test(spaces)) {
							const line = node.line;
							const col = 1;
							reports.push({
								level: this.defaultLevel,
								message: 'Expected spaces. Indentaion is required tabs.',
								line,
								col,
								raw: `${lastNode.textContent}${node}`,
							});
						}
					}
					if (typeof config.value === 'number') {
						if (!/^ +$/.test(spaces)) {
							const line = node.line;
							const col = 1;
							reports.push({
								level: this.defaultLevel,
								message: 'Expected spaces. Indentaion is required spaces.',
								line,
								col,
								raw: `${lastNode.textContent}${node}`,
							});
						} else if (spaces.length % config.value) {
							const line = node.line;
							const col = 1;
							reports.push({
								level: this.defaultLevel,
								message: `Expected spaces. Indentaion is required ${config.value} width spaces.`,
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
