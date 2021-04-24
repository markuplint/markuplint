import { ElementFixWalker, ElementVerifyWalkerFactory } from '../types';
import { Result, createRule } from '@markuplint/ml-core';

export type Value = 'no-upper' | 'no-lower';

const verifyWalker: ElementVerifyWalkerFactory<Value> = (reports, translate) => node => {
	const ms = node.rule.severity === 'error' ? 'must' : 'should';
	const deny = node.rule.value === 'no-upper' ? /[A-Z]/ : /[a-z]/;
	const cases = node.rule.value === 'no-upper' ? 'lower' : 'upper';
	const message = translate(`{0} of {1} ${ms} be {2}`, 'Attribute name', 'HTML elements', `${cases}case`);
	if (node.namespaceURI === 'http://www.w3.org/1999/xhtml') {
		if (node.attributes) {
			for (const attr of node.attributes) {
				if (attr.attrType === 'ps-attr') {
					continue;
				}
				const name = attr.getName();
				if (deny.test(name.raw)) {
					reports.push({
						severity: node.rule.severity,
						message,
						line: name.line,
						col: name.col,
						raw: name.raw,
					});
				}
			}
		}
	}
};

const fixWalker: ElementFixWalker<Value> = node => {
	if (node.namespaceURI === 'http://www.w3.org/1999/xhtml') {
		if (node.attributes) {
			for (const attr of node.attributes) {
				if (attr.attrType === 'html-attr') {
					if (node.rule.value === 'no-upper') {
						attr.name.fix(attr.name.raw.toLowerCase());
					} else {
						attr.name.fix(attr.name.raw.toUpperCase());
					}
				}
			}
		}
	}
};

export default createRule<Value, null>({
	name: 'case-sensitive-attr-name',
	defaultLevel: 'warning',
	defaultValue: 'no-upper',
	defaultOptions: null,
	async verify(document, translate) {
		const reports: Result[] = [];
		await document.walkOn('Element', verifyWalker(reports, translate));
		return reports;
	},
	verifySync(document, translate) {
		const reports: Result[] = [];
		document.walkOnSync('Element', verifyWalker(reports, translate));
		return reports;
	},
	async fix(document) {
		await document.walkOn('Element', fixWalker);
	},
	fixSync(document) {
		document.walkOnSync('Element', fixWalker);
	},
});
