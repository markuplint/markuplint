import { createRule } from '@markuplint/ml-core';

import meta from './meta.js';

/** The enforced letter case for tag names. */
export type Value = 'lower' | 'upper';

export default createRule<Value>({
	meta: meta,
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
			const fixedName = el.rule.value === 'lower' ? el.rawName.toLowerCase() : el.rawName.toUpperCase();
			const message = t(
				`{0} ${ms} be {1}`,
				t('{0} of {1}', 'tag names', 'HTML elements'),
				`${el.rule.value}case`,
			);
			if (deny.test(el.rawName)) {
				const loc = el.getNameLocation();
				const nameOffset = loc.offset + el.tagOpenChar.length;
				report({
					scope: el,
					message,
					line: loc.line,
					col: loc.col,
					raw: el.rawName,
					fix: fixer => fixer.replaceText({ startOffset: nameOffset, raw: el.rawName }, fixedName),
				});
			}
			const closeTag = el.closeTag;
			if (closeTag && deny.test(closeTag.rawName)) {
				const closeNameOffset = closeTag.startOffset + el.tagOpenChar.length + '/'.length;
				const fixedCloseName =
					el.rule.value === 'lower' ? closeTag.rawName.toLowerCase() : closeTag.rawName.toUpperCase();
				report({
					scope: {
						rule: el.rule,
						startLine: closeTag.startLine,
						startCol: closeTag.startCol,
						raw: closeTag.raw,
					},
					message,
					fix: fixer =>
						fixer.replaceText({ startOffset: closeNameOffset, raw: closeTag.rawName }, fixedCloseName),
				});
			}
		});
	},
});
