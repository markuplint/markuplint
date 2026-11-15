import { createRule, getAttrSpecs, getSpec } from '@markuplint/ml-core';

import { createIgnoreFeaturesLookup, findAttrSpec, isFlagCheckedElement } from '../helpers.js';
import meta from './meta.js';

/**
 * Options for the `no-nonstandard-features` rule.
 */
type Options = {
	/**
	 * Features to ignore: an element name ("dialog") or an attribute of an element ("input[list]"). The
	 * element name is a local name with no namespace, so it names the element of that name in HTML, SVG
	 * and MathML alike ("a[interestfor]" covers the HTML and the SVG `a`). It is compared as the
	 * document compares tag names, the attribute name as the DOM compares it with the attribute that is
	 * checked.
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
			if (!isFlagCheckedElement(el)) {
				return;
			}

			const elName = el.localName;
			const elIgnoreFeatures = el.rule.options.ignoreFeatures;

			if (!ignored.isElementIgnored(elIgnoreFeatures, elName)) {
				const spec = getSpec(el, document.specs.specs);
				if (spec?.nonStandard) {
					report({
						scope: el,
						message: t('{0} is {1:c}', t('the "{0*}" {1}', elName, 'element'), 'non-standard'),
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

				if (attrSpec?.nonStandard) {
					report({
						scope: attr,
						line: attr.nameNode?.startLine,
						col: attr.nameNode?.startCol,
						raw: attr.nameNode?.raw,
						message: t('{0} is {1:c}', t('the "{0*}" {1}', attrName, 'attribute'), 'non-standard'),
					});
				}
			}
		});
	},
});
