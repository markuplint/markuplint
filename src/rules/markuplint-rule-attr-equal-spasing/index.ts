import { VerifyReturn } from '../../rule';
import CustomRule from '../../rule/custom-rule';

type Value = 'always' | 'never' | 'always-single-line' | 'never-single-line';

export default CustomRule.create<Value, null>({
	name: 'attr-equal-spasing',
	defaultLevel: 'warning',
	defaultValue: 'never',
	defaultOptions: null,
	async verify (document, messages) {
		const reports: VerifyReturn[] = [];
		const message = messages('error');
		await document.walkOn('Element', async (node) => {
			if (!node.rule) {
				return;
			}
			for (const attr of node.attributes) {
				if (!attr.equal) {
					continue;
				}
				const hasSpaceBefore = /^\s+=/.test(attr.equal);
				const hasSpaceAfter = /=\s+$/.test(attr.equal);
				const beforeNewLine = /^\s*\r?\n\s*=/.test(attr.equal);
				const afterNewLine = /=\s*\r?\n\s*$/.test(attr.equal);
				// console.log({ hasSpaceBefore, hasSpaceAfter, beforeNewLine, afterNewLine, raw: attr.raw });
				let isBad = false;
				switch (node.rule.value) {
					case 'always': {
						isBad = !(hasSpaceBefore && hasSpaceAfter);
						break;
					}
					case 'never': {
						isBad = hasSpaceBefore || hasSpaceAfter;
						break;
					}
					case 'always-single-line': {
						// or 'no-newline'
						isBad = beforeNewLine || afterNewLine;
						break;
					}
					case 'never-single-line': {
						isBad = (hasSpaceBefore && !beforeNewLine) || (hasSpaceAfter && !afterNewLine);
						break;
					}
				}
				if (isBad) {
					reports.push({
						severity: node.rule.severity,
						level: node.rule.severity,
						message: node.rule.value,
						line: attr.location.line,
						col: attr.location.col,
						raw: attr.raw,
					});
				}
			}
		});
		return reports;
	},
});
