import { createRule, getAttrSpecs, getSpec } from '@markuplint/ml-core';

import { createIgnoreFeaturesLookup, findAttrSpec } from '../helpers.js';
import meta from './meta.js';

/**
 * Options for the `no-experimental-features` rule.
 */
type Options = {
	/**
	 * Features to ignore: an element name ("dialog") or an attribute of an element ("input[list]"). The
	 * element name is compared as the document compares tag names, the attribute name as the DOM
	 * compares it with the attribute that is checked.
	 */
	readonly ignoreFeatures?: readonly string[];
};

export default createRule<boolean, Options>({
	meta: meta,
	defaultSeverity: 'warning',
	defaultOptions: {},
	async verify({ document, report, t }) {
		const ignored = createIgnoreFeaturesLookup(document.tagNameCaseSensitive, document.rule.options.ignoreFeatures);

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
			const elIgnoreFeatures = el.rule.options.ignoreFeatures;

			if (!ignored.isElementIgnored(elIgnoreFeatures, elName)) {
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

				if (ignored.isAttrIgnored(elIgnoreFeatures, elName, attr)) {
					continue;
				}

				const attrSpec = attrSpecs && findAttrSpec(attrSpecs, attr);

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
