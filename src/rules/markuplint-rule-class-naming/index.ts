import {
	Document,
	Element,
} from '../../parser';
import Rule, {
	RuleConfig,
	RuleLevel,
	VerifyReturn,
} from '../../rule';
import Ruleset from '../../ruleset';
import messages from '../messages';

export type Value = string | string[] | null;

export default class extends Rule<Value> {
	public name = 'class-naming';
	public defaultLevel: RuleLevel = 'warning';
	public defaultValue: Value = null;

	public async verify (document: Document, config: RuleConfig<Value>, ruleset: Ruleset, locale: string) {
		const reports: VerifyReturn[] = [];
		// const message = await messages(locale, `{0} of {1} ${ms} be {2}`, 'Attribute name', 'HTML', `${config.value}case`);
		await document.walkOn('Element', async (node) => {
			if (config.value) {
				const classPatterns = Array.isArray(config.value) ? config.value : [config.value];
				for (const classPattern of classPatterns) {
					for (const className of node.classList) {
						if (!match(className, classPattern)) {
							const attr = node.getAttribute('class');
							if (!attr) {
								continue;
							}
							reports.push({
								level: config.level,
								message: `"${className}" class name is unmatched pattern of "${classPattern}"`,
								line: attr.location.line,
								col: attr.location.col,
								raw: attr.raw,
							});
						}
					}
				}
			}
		});
		return reports;
	}
}

function match (needle: string, pattern: string) {
	const matches = pattern.match(/^\/(.*)\/(i|g|m)*$/);
	if (matches && matches[1]) {
		const re = matches[1];
		const flag = matches[2];
		return new RegExp(re, flag).test(needle);
	}
	return needle === pattern;
}
