import {
	Document,
	GhostNode,
	Node,
	RawTextNode,
	TextNode,
} from '../../parser';
import Rule, {
	RuleConfig,
	RuleLevel,
	VerifyReturn,
} from '../../rule';
import Ruleset from '../../ruleset';

export type DefaultValue = 'tab' | number;

/**
 * `Indentation`
 *
 * *Core rule*
 */
export default class extends Rule<DefaultValue> {
	public name = 'indentation';
	public defaultLevel: RuleLevel = 'warning';
	public defaultValue: DefaultValue = 2;

	public async verify (document: Document, config: RuleConfig<DefaultValue>, ruleset: Ruleset) {
		const reports: VerifyReturn[] = [];
		let lastNode: Node | GhostNode;
		await document.walk(async (node) => {
			if (node instanceof GhostNode) {
				return;
			}
			if (node instanceof TextNode) {
				if (node instanceof RawTextNode) {
					return;
				}
				const matched = node.raw.match(/(^\s*)([^\s]+)/);
				if (matched) {
					const spaces = matched[1];
					if (!spaces) {
						return;
					}
					const spaceLines = spaces.split(/\r?\n/);
					const line = spaceLines.length + node.line - 1;
					const lastSpace = spaceLines.pop();
					if (!lastSpace) {
						return;
					}
					const report = indent(lastSpace, node, `${lastSpace}`, line, config);
					if (report) {
						reports.push(report);
					}
				}
			}
			if (lastNode instanceof TextNode) {
				const matched = lastNode.raw.match(/\r?\n([ \t]+$)/);
				if (matched) {
					const spaces = matched[1];
					if (!spaces) {
						throw new TypeError(`Expected error.`);
					}
					const report = indent(spaces, node, `${spaces}`, node.line, config);
					if (report) {
						reports.push(report);
					}
				}
			}
			lastNode = node;
		});
		return reports;
	}
}

function indent (spaces: string, node: Node, raw: string, line: number, config: RuleConfig<DefaultValue>) {
	if (config.value === 'tab') {
		if (!/^\t*$/.test(spaces)) {
			return {
				level: config.level,
				message: 'Expected spaces. Indentaion is required tabs.',
				line,
				col: 1,
				raw,
			};
		}
	}
	if (typeof config.value === 'number') {
		if (!/^ *$/.test(spaces)) {
			return {
				level: config.level,
				message: 'Expected spaces. Indentaion is required spaces.',
				line,
				col: 1,
				raw,
			};
		} else if (spaces.length % config.value) {
			return {
				level: config.level,
				message: `Expected spaces. Indentaion is required ${config.value} width spaces.`,
				line,
				col: 1,
				raw,
			};
		}
	}
}
