import CustomRule from '@markuplint/ml-core/lib/ml-core/src/ml-rule';
import { Result } from '@markuplint/ml-core/lib/ml-core/src/ml-rule/types';

export type Value = 'always' | 'never';

export default CustomRule.create<Value, null>({
	name: 'async-attr-in-script',
	defaultLevel: 'warning',
	defaultValue: 'always',
	defaultOptions: null,
	async verify(document, messages) {
		const reports: Result[] = [];
		await document.walkOn('Element', async elem => {
			if (!elem.matches('script[src]')) {
				return;
			}
			const hasAsyncAttr = !elem.hasAttribute('async');
			let bad = false;
			let necessary: string;
			switch (elem.rule.value) {
				case 'always': {
					necessary = 'Required {0}';
					bad = hasAsyncAttr;
					break;
				}
				case 'never': {
					necessary = 'Not required {0}';
					bad = !hasAsyncAttr;
					break;
				}
				default: {
					return;
				}
			}
			if (bad) {
				const message = messages(necessary, '{$} attribute');
				reports.push({
					severity: elem.rule.severity,
					message: message.replace('{$}', 'async'),
					line: elem.startLine,
					col: elem.startCol,
					raw: elem.raw,
				});
			}
		});
		return reports;
	},
});
