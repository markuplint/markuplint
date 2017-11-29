import {
	Document,
	Element,
} from '../parser';
import Rule, {
	RuleConfig,
	VerifiedReport,
} from '../rule';
import {
	PermittedContent,
	Ruleset,
} from '../ruleset';

/**
 * `attr-value-quotes`
 *
 * *Core rule*
 */
export default class extends Rule<'double' | 'single'> {
	public name = 'attr-value-quotes';
	public defaultValue: 'double' | 'single' = 'double';

	public verify (document: Document, config: RuleConfig<'double' | 'single'>, ruleset: Ruleset) {
		const quote = {
			double: '"',
			single: "'",
		};
		const reports: VerifiedReport[] = [];
		document.walk((node) => {
			if (node instanceof Element) {
				for (const attr of node.attributes) {
					for (const rawAttr of attr.rawAttr) {
						if (rawAttr.quote !== quote[config.value]) {
							reports.push({
								level: this.defaultLevel,
								message: `Attribute value is must quote on ${config.value}`,
								line: rawAttr.line + node.line,
								col: rawAttr.line === 0 ? rawAttr.col + node.col - 1 : rawAttr.col,
								raw: rawAttr.raw,
							});
						}
					}
				}
			}
		});
		return reports;
	}
}
