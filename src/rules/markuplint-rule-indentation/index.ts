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
import messages from '../messages';

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

	public async verify (document: Document, config: RuleConfig<DefaultValue>, ruleset: Ruleset, locale: string) {
		const reports: VerifyReturn[] = [];
		const ms = config.level === 'error' ? 'must' : 'should';
		await document.walk(async (node) => {
			if (node instanceof Node) {
				if (node.indentation) {
					let spec: string | null = null;
					if (config.value === 'tab' && node.indentation.type !== 'tab') {
						spec = 'tab';
					} else if (typeof config.value === 'number' && node.indentation.type !== 'space') {
						spec = 'space';
					} else if (typeof config.value === 'number' && node.indentation.type === 'space' && node.indentation.width % config.value) {
						spec = await messages(locale, `{0} width spaces`, `${config.value}`);
					}
					if (spec) {
						const message = await messages(locale, `{0} ${ms} be {1}`, 'Indentation', spec);
						reports.push({
							level: config.level,
							message,
							line: node.indentation.line,
							col: 1,
							raw: node.indentation.raw,
						});
					}
				}
			}
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
