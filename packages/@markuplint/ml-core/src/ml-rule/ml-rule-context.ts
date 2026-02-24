import type { CheckerReport } from './types.js';
import type { MLDocument } from '../ml-dom/node/document.js';
import type { LocaleSet, Translator } from '@markuplint/i18n';
import type { PlainData, Report, RuleConfigValue } from '@markuplint/ml-config';

import { translator } from '@markuplint/i18n';

export class MLRuleContext<T extends RuleConfigValue, O extends PlainData = undefined> {
	readonly document: MLDocument<T, O>;
	readonly locale: string;
	#reports: Report<T, O>[] = [];
	#reportKeys = new Set<string>();
	readonly translate: Translator;

	constructor(
		// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
		document: MLDocument<T, O>,
		locale: LocaleSet,
	) {
		this.document = document;
		this.translate = translator(locale);
		this.locale = locale.locale;
	}

	get reports() {
		return this.#reports;
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
				this.#push(r);
				return true;
			}
			return false;
		}
		this.#push(report);
	}

	#push(report: Report<T, O>) {
		const key = reportKey(report);
		if (!this.#reportKeys.has(key)) {
			this.#reportKeys.add(key);
			this.#reports.push({
				...report,
				message: finish(report.message, this.locale),
			});
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

function reportKey<T extends RuleConfigValue, O extends PlainData>(report: Report<T, O>): string {
	if ('col' in report && report.col != null) {
		return `${report.line}:${report.col}:${report.message}:${report.raw}`;
	}
	if ('scope' in report) {
		return `${report.scope.startLine}:${report.scope.startCol}:${report.message}`;
	}
	return report.message;
}
