import { createRule } from '@markuplint/ml-core';

export type Value = 'lower' | 'upper';

export default createRule<Value>({
	meta: {
		category: 'style',
	},
	defaultSeverity: 'warning',
	defaultValue: 'lower',
	async verify({ document, report, t }) {
		if (document.tagNameCaseSensitive) {
			return;
		}
		await document.walkOn('Element', el => {
			if (el.isForeignElement || el.elementType !== 'html') {
				return;
			}
			const ms = el.rule.severity === 'error' ? 'must' : 'should';
			const deny = el.rule.value === 'lower' ? /[A-Z]/ : /[a-z]/;
			const message = t(
				`{0} ${ms} be {1}`,
				t('{0} of {1}', 'tag names', 'HTML elements'),
				`${el.rule.value}case`,
			);
			if (deny.test(el.rawName)) {
				const loc = el.getNameLocation();
				report({
					scope: el,
					message,
					line: loc.line,
					col: loc.col,
					raw: el.rawName,
				});
			}
			const closeTag = el.closeTag;
			if (closeTag && deny.test(closeTag.raw)) {
				report({
					scope: {
						rule: el.rule,
						startLine: closeTag.startLine,
						startCol: closeTag.startCol,
						raw: closeTag.raw,
					},
					message,
				});
			}
		});
	},
	async fix({ document }) {
		if (document.tagNameCaseSensitive) {
			return;
		}
		await document.walkOn('Element', el => {
			if (el.isForeignElement || el.elementType !== 'html') {
				return;
			}
			const deny = el.rule.value === 'lower' ? /[A-Z]/ : /[a-z]/;
			if (deny.test(el.nodeName)) {
				if (el.rule.value === 'lower') {
					el.fixNodeName(el.nodeName.toLowerCase());
				} else {
					el.fixNodeName(el.nodeName.toUpperCase());
				}
			}
		});
	},
});
