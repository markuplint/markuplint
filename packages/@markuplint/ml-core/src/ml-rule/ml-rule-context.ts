import { Report, RuleConfigValue, RuleInfo } from '@markuplint/ml-config';
import Document from '../ml-dom/document';
import { Translator } from '@markuplint/i18n';

export class MLRuleContext<T extends RuleConfigValue, O = null> {
	readonly document: Document<T, O>;
	readonly translate: Translator;
	readonly globalRule: RuleInfo<T, O>;

	#reports: Report<T, O>[] = [];

	constructor(document: Document<T, O>, translator: Translator, rule: RuleInfo<T, O>) {
		this.document = document;
		this.translate = translator;
		this.globalRule = rule;
	}

	get reports() {
		return this.#reports.slice();
	}

	report(report: Report<T, O>) {
		this.#reports.push(report);
	}
}
