import { createRule, getAttrSpecs } from '@markuplint/ml-core';

import meta from './meta.js';

/** The enforced letter case for attribute names. */
export type Value = 'lower' | 'upper';

export default createRule<Value>({
	meta: meta,
	defaultSeverity: 'warning',
	defaultValue: 'lower',
	async verify({ document, report, t }) {
		await document.walkOn('Attr', attr => {
			const el = attr.ownerElement;
			if (el.isForeignElement || el.elementType !== 'html') {
				return;
			}

			const value = attr.rule.value;

			const ms = attr.rule.severity === 'error' ? 'must' : 'should';
			const deny = value === 'lower' ? /[A-Z]/ : /[a-z]/;
			const cases = value === 'lower' ? 'lower' : 'upper';
			const message = t(`{0} ${ms} be {1}`, t('{0} of {1}', 'attribute names', 'HTML elements'), `${cases}case`);
			const attrSpecs = getAttrSpecs(el, document.specs);

			/**
			 * Ignore when it has the potential name,
			 * it Interprets `tabIndex` to `tabindex` in JSX for example.
			 */
			if (attr.nameNode?.raw !== attr.name) {
				return;
			}

			const name = attr.name;

			if (attrSpecs) {
				const spec = attrSpecs.find(spec => spec.name === name);
				if (spec && spec.caseSensitive) {
					return;
				}
			}

			if (deny.test(name)) {
				const nameNode = attr.nameNode;
				const fixedName = value === 'lower' ? name.toLowerCase() : name.toUpperCase();
				report({
					scope: attr,
					line: nameNode?.startLine,
					col: nameNode?.startCol,
					raw: nameNode?.raw,
					message,
					fix: nameNode ? fixer => fixer.replaceText(nameNode, fixedName) : undefined, // eslint-disable-line @typescript-eslint/strict-boolean-expressions
				});
			}
		});
	},
});
