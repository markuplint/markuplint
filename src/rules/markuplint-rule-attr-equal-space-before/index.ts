import { VerifyReturn } from '../../rule';
import CustomRule from '../../rule/custom-rule';

type Value = 'always' | 'never' | 'always-single-line' | 'never-single-line';

export default CustomRule.create<Value, null>({
	name: 'attr-equal-space-before',
	defaultLevel: 'warning',
	defaultValue: 'never',
	defaultOptions: null,
	async verify (document, messages) {
		const reports: VerifyReturn[] = [];
		const message = messages('error');
		document.syncWalkOn('Element', (node) => {
			for (const attr of node.attributes) {
				if (!attr.equal) {
					continue;
				}
				const hasSpace = !!attr.spacesBeforeEqual.raw;
				const hasLineBreak = /\r?\n/.test(attr.spacesBeforeEqual.raw);
				let isBad = false;
				switch (node.rule.value) {
					case 'always': {
						isBad = !hasSpace;
						break;
					}
					case 'never': {
						isBad = hasSpace;
						break;
					}
					case 'always-single-line': {
						// or 'no-newline'
						isBad = !hasSpace || hasLineBreak;
						break;
					}
					case 'never-single-line': {
						isBad = hasSpace && !hasLineBreak;
						break;
					}
				}
				if (isBad) {
					reports.push({
						severity: node.rule.severity,
						level: node.rule.severity,
						message: node.rule.value,
						line: attr.spacesBeforeEqual.line,
						col: attr.spacesBeforeEqual.col,
						raw: attr.spacesBeforeEqual.raw + attr.equal.raw + attr.spacesAfterEqual.raw,
					});
				}
			}
		});
		return reports;
	},
	async fix (document) {
		document.syncWalkOn('Element', (node) => {
			for (const attr of node.attributes) {
				if (!attr.equal) {
					continue;
				}
				const hasSpace = !!attr.spacesBeforeEqual.raw;
				const hasLineBreak = /\r?\n/.test(attr.spacesBeforeEqual.raw);
				switch (node.rule.value) {
					case 'always': {
						if (!hasSpace) {
							attr.spacesBeforeEqual.fix(' ');
						}
						break;
					}
					case 'never': {
						attr.spacesBeforeEqual.fix('');
						break;
					}
					case 'always-single-line': {
						// or 'no-newline'
						if (!hasSpace || hasLineBreak) {
							attr.spacesBeforeEqual.fix(' ');
						}
						break;
					}
					case 'never-single-line': {
						if (hasSpace && !hasLineBreak) {
							attr.spacesBeforeEqual.fix('');
						}
						break;
					}
				}
			}
		});
	},
});
