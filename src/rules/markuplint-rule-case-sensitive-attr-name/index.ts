import {
	Document,
	Element,
} from '../../parser';
import Rule, {
	RuleConfig,
	RuleLevel,
	VerifiedResult,
} from '../../rule';
import {
	PermittedContent,
	Ruleset,
} from '../../ruleset';
import messages from '../messages';

export type Value = 'lower' | 'upper';

export default class extends Rule<Value> {
	public name = 'case-sensitive-attr-name';
	public defaultLevel: RuleLevel = 'warning';
	public defaultValue: Value = 'lower';

	public async verify (document: Document, config: RuleConfig<Value>, ruleset: Ruleset) {
		const reports: VerifiedResult[] = [];
		document.walk((node) => {
			if (node instanceof Element && node.namespaceURI === 'http://www.w3.org/1999/xhtml') {
				if (node.attributes) {
					for (const attr of node.attributes) {
						for (const rawAttr of attr.rawAttr) {
							if (/[A-Z]/.test(rawAttr.name)) {
								reports.push({
									level: this.defaultLevel,
									message: 'HTML attribute name must be lowercase',
									line: rawAttr.line,
									col: rawAttr.col,
									raw: rawAttr.raw,
								});
							}
						}
					}
				}
			}
		});
		return reports;
	}
}
