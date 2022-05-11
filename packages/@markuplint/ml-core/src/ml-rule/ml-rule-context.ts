import type { MLDocument } from '../ml-dom/node/document';
import type { LocaleSet, Translator } from '@markuplint/i18n';
import type { Report, RuleConfigValue } from '@markuplint/ml-config';

import { translator } from '@markuplint/i18n';

export class MLRuleContext<T extends RuleConfigValue, O = null> {
	#reports: Report<T, O>[] = [];
	readonly document: MLDocument<T, O>;
	readonly locale: string;
	readonly translate: Translator;

	get reports() {
		return this.#reports.map(report => ({
			...report,
			message: finish(report.message),
		}));
	}

	constructor(document: MLDocument<T, O>, locale: LocaleSet) {
		this.document = document;
		this.translate = translator(locale);
		this.locale = locale.locale;
	}

	provide() {
		return {
			document: this.document,
			translate: this.translate,
			t: this.translate,
			reports: this.reports,
			report: this.report.bind(this),
		};
	}

	report(report: Report<T, O>) {
		this.#reports.push(report);
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
