import cssSelector from '../../dom/css-selector';
import { VerifyReturn } from '../../rule';
import CustomRule from '../../rule/custom-rule';
import messages from '../messages';

export type Value = 'always' | 'never';

export default CustomRule.create<Value, null>({
	name: 'async-attr-in-script',
	defaultLevel: 'warning',
	defaultValue: 'always',
	defaultOptions: null,
	async verify (document, locale) {
		const reports: VerifyReturn[] = [];
		await document.walkOn('Element', async (node) => {
			if (!node.rule) {
				return;
			}
			if (!node.matches('script[src]')) {
				return;
			}
			const hasAsyncAttr = !node.hasAttribute('async');
			let bad = false;
			let necessary: string;

			switch (node.rule.value) {
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
				const message = await messages(locale, necessary, '{$} attribute');
				reports.push({
					level: node.rule.level,
					message: message.replace('{$}', 'async'),
					line: node.line,
					col: node.col,
					raw: node.raw,
				});
			}
		});
		return reports;
	},
});
