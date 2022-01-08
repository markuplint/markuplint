import { createRule, getAttrSpecs } from '@markuplint/ml-core';

export type Value = 'no-upper' | 'no-lower';

export default createRule<Value>({
	defaultServerity: 'warning',
	defaultValue: 'no-upper',
	async verify({ document, report, t }) {
		await document.walkOn('Element', async node => {
			if (node.isForeignElement || node.isCustomElement) {
				return;
			}
			const ms = node.rule.severity === 'error' ? 'must' : 'should';
			const deny = node.rule.value === 'no-upper' ? /[A-Z]/ : /[a-z]/;
			const cases = node.rule.value === 'no-upper' ? 'lower' : 'upper';
			const message = t(`{0} ${ms} be {1}`, t('{0} of {1}', 'attribute names', 'HTML elements'), `${cases}case`);
			const attrSpecs = getAttrSpecs(node.nameWithNS, document.specs);

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
					report({
						scope: node,
						message,
						line: name.line,
						col: name.col,
						raw: name.raw,
					});
				}
			}
		});
	},
	async fix({ document }) {
		await document.walkOn('Element', async node => {
			if (node.isForeignElement || node.isCustomElement) {
				return;
			}

			const attrSpecs = getAttrSpecs(node.nameWithNS, document.specs);

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
