import { createRule, getAttrSpecs, getSpec } from '@markuplint/ml-core';

import meta from './meta.js';

/**
 * Options for the `no-experimental-features` rule.
 */
type Options = {
	/** Features to ignore. Element name ("dialog") or attribute pattern ("input[list]"). */
	readonly ignoreFeatures?: readonly string[];
};

export default createRule<boolean, Options>({
	meta: meta,
	defaultSeverity: 'warning',
	defaultOptions: {},
	async verify({ document, report, t }) {
		const options = document.rule.options;
		const ignoreFeatures = new Set(options.ignoreFeatures);

		await document.walkOn('Element', el => {
			// Web components and authored elements (JSX/Vue/Svelte) reach this rule
			// via `pretenders`: they masquerade as a known HTML element on `el.localName`,
			// so spec lookups below resolve correctly. See #3740.
			if (
				el.namespaceURI !== 'http://www.w3.org/1999/xhtml' ||
				(el.elementType !== 'html' && el.pretenderContext?.type !== 'pretender')
			) {
				return;
			}

			const elName = el.localName;
			const elOptions = el.rule.options;
			const elIgnoreFeatures = new Set(elOptions.ignoreFeatures ?? ignoreFeatures);

			if (!elIgnoreFeatures.has(elName)) {
				const spec = getSpec(el, document.specs.specs);
				if (spec?.experimental) {
					report({
						scope: el,
						message: t('{0} is {1:c}', t('the "{0*}" {1}', elName, 'element'), 'experimental'),
					});
				}
			}

			const attrSpecs = getAttrSpecs(el, document.specs);

			for (const attr of el.attributes) {
				if (attr.isDirective) {
					continue;
				}

				const attrName = attr.name;
				const ignoreKey = `${elName}[${attrName}]`;

				if (elIgnoreFeatures.has(ignoreKey)) {
					continue;
				}

				const attrSpec = attrSpecs?.find(s => s.name === attrName);

				if (attrSpec?.experimental) {
					report({
						scope: attr,
						line: attr.nameNode?.startLine,
						col: attr.nameNode?.startCol,
						raw: attr.nameNode?.raw,
						message: t('{0} is {1:c}', t('the "{0*}" {1}', attrName, 'attribute'), 'experimental'),
					});
				}
			}
		});
	},
});
