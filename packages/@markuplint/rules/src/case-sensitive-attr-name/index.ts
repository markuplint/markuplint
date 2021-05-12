import { Result, createRule } from '@markuplint/ml-core';
import { getAttrSpecs } from '../helpers';

export type Value = 'no-upper' | 'no-lower';

export default createRule<Value, null>({
	name: 'case-sensitive-attr-name',
	defaultLevel: 'warning',
	defaultValue: 'no-upper',
	defaultOptions: null,
	async verify(document, translate) {
		const reports: Result[] = [];
		await document.walkOn('Element', async node => {
			if (node.namespaceURI !== 'http://www.w3.org/1999/xhtml' || node.isCustomElement) {
				return;
			}
			const ms = node.rule.severity === 'error' ? 'must' : 'should';
			const deny = node.rule.value === 'no-upper' ? /[A-Z]/ : /[a-z]/;
			const cases = node.rule.value === 'no-upper' ? 'lower' : 'upper';
			const message = translate(`{0} of {1} ${ms} be {2}`, 'Attribute name', 'HTML elements', `${cases}case`);
			const attrSpecs = getAttrSpecs(node.nodeName.toLowerCase(), document.specs);

			for (const attr of node.attributes) {
				if (attr.attrType === 'ps-attr') {
					continue;
				}

				/**
				 * Ignore when it has the potential name,
				 * it Interprets `tabIndex` to `tabindex` in JSX for example.
				 */
				if (attr.name.raw !== attr.potentialName) {
					continue;
				}
				const name = attr.getName();

				if (attrSpecs) {
					const spec = attrSpecs.find(spec => spec.name === name.raw);
					if (spec && spec.caseSensitive) {
						continue;
					}
				}

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
		});
		return reports;
	},
	async fix(document) {
		await document.walkOn('Element', async node => {
			if (node.namespaceURI !== 'http://www.w3.org/1999/xhtml' || node.isCustomElement) {
				return;
			}

			const attrSpecs = getAttrSpecs(node.nodeName.toLowerCase(), document.specs);

			if (node.attributes) {
				for (const attr of node.attributes) {
					if (attr.attrType === 'ps-attr') {
						continue;
					}

					/**
					 * Ignore when it has the potential name,
					 * it Interprets `tabIndex` to `tabindex` in JSX for example.
					 */
					if (attr.name.raw !== attr.potentialName) {
						continue;
					}
					const name = attr.getName();

					if (attrSpecs) {
						const spec = attrSpecs.find(spec => spec.name === name.raw);
						if (spec && spec.caseSensitive) {
							continue;
						}
					}

					if (node.rule.value === 'no-upper') {
						attr.name.fix(attr.name.raw.toLowerCase());
					} else {
						attr.name.fix(attr.name.raw.toUpperCase());
					}
				}
			}
		});
	},
});
