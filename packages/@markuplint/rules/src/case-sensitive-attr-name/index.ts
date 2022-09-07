import { createRule, getAttrSpecs } from '@markuplint/ml-core';

export type Value = 'lower' | 'upper';

export default createRule<Value>({
	defaultServerity: 'warning',
	defaultValue: 'lower',
	verify({ document, report, t }) {
		void document.walkOn('Attr', attr => {
			const el = attr.ownerElement;
			if (el.isForeignElement || el.isCustomElement) {
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
				report({
					scope: attr,
					line: attr.nameNode?.startLine,
					col: attr.nameNode?.startCol,
					raw: attr.nameNode?.raw,
					message,
				});
			}
		});
	},
	fix({ document }) {
		void document.walkOn('Attr', attr => {
			const el = attr.ownerElement;

			if (el.isForeignElement || el.isCustomElement) {
				return;
			}

			const attrSpecs = getAttrSpecs(el, document.specs);

			const value = attr.rule.value;

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

			if (value === 'lower') {
				attr.nameNode.fix(name.toLowerCase());
			} else {
				attr.nameNode.fix(name.toUpperCase());
			}
		});
	},
});
