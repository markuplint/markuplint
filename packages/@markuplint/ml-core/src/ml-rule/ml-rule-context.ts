import type { MLDocument } from '../ml-dom/node/document';
import type { CheckerReport } from './types';
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

	report(report: Report<T, O>): undefined;
	report(report: CheckerReport<T, O>): boolean;
	report(report: Report<T, O> | CheckerReport<T, O>): undefined | boolean {
		if (typeof report === 'function') {
			const r = report(this.translate);
			if (r) {
				this._push(r);
				return true;
			}
			return false;
		}
		this._push(report);
	}

	private _push(report: Report<T, O>) {
		if (!this.#reports.find(r => is(r, report))) {
			this.#reports.push(report);
		}
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

function is<T extends RuleConfigValue, O = null>(r1: Report<T, O>, r2: Report<T, O>): boolean {
	if ('col' in r1 && 'col' in r2) {
		return r1.col === r2.col && r1.line === r2.line && r1.message === r2.message && r1.raw === r2.raw;
	}

	if ('scope' in r1) {
		if (!('scope' in r2)) {
			return false;
		}

		return r1.scope === r2.scope && r1.message === r2.message;
	}

	return false;
}
