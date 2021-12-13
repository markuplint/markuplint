import type Document from '../ml-dom/document';
import type { LocaleSet, Translator } from '@markuplint/i18n';
import type { Report, RuleConfigValue, RuleInfo } from '@markuplint/ml-config';

import { translator } from '@markuplint/i18n';

export class MLRuleContext<T extends RuleConfigValue, O = null> {
	readonly document: Document<T, O>;
	readonly globalRule: RuleInfo<T, O>;
	readonly translate: Translator;
	readonly locale: string;

	#reports: Report<T, O>[] = [];

	constructor(document: Document<T, O>, locale: LocaleSet, rule: RuleInfo<T, O>) {
		this.document = document;
		this.globalRule = rule;
		this.translate = translator(locale);
		this.locale = locale.locale;
	}

	get reports() {
		return this.#reports.map(report => ({
			...report,
			message: finish(report.message),
		}));
	}

	report(report: Report<T, O>) {
		this.#reports.push(report);
	}

	provide() {
		return {
			document: this.document,
			translate: this.translate,
			t: this.translate,
			globalRule: this.globalRule,
			reports: this.reports,
			report: this.report.bind(this),
		};
	}
}

function finish(message: string, locale = 'en') {
	switch (locale) {
		case 'en': {
			return message.replace(/^[a-z]/, $0 => $0.toUpperCase());
		}
	}
	return message;
}
