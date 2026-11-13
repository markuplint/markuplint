import { createRule } from '@markuplint/ml-core';

import { getDOMValue, querySelectorAllInTree } from '../helpers.js';

import meta from './meta.js';

/**
 * Require the `usemap` attribute on an `<img>` element to be a valid
 * hash-name reference to a `<map>` element. Per HTML LS's definition of
 * "valid hash-name reference": a string consisting of "#" followed by a
 * string that exactly matches the `name` attribute of an element of the
 * referenced type in the same tree — matching is by `name`, not `id`, so
 * `no-refer-to-non-existent-id` (which only tracks `id` references) never
 * covers this attribute.
 *
 * @see https://html.spec.whatwg.org/multipage/image-maps.html#attr-hyperlink-usemap
 * @see https://html.spec.whatwg.org/multipage/common-microsyntaxes.html#valid-hash-name-reference
 */
export default createRule<boolean, null>({
	meta: meta,
	defaultValue: true,
	defaultOptions: null,
	async verify({ document, report, t }) {
		await document.walkOn('Element', el => {
			if (el.localName !== 'img') return;
			if (el.pretenderContext?.type === 'pretender' && !el.hasAttr('as')) return;

			const usemapAttr = el.getAttrNode('usemap');
			if (!usemapAttr) return;
			if (usemapAttr.isDynamicValue) return;

			// The character references are resolved on both sides, as the DOM has the strings
			const value = getDOMValue(usemapAttr) ?? usemapAttr.value;
			if (!value.startsWith('#') || value.length <= 1) return;

			const targetName = value.slice(1);
			const target = querySelectorAllInTree(el, 'map').find(candidate => {
				const name = candidate.getAttrNode('name');
				if (!name) {
					return false;
				}
				// A name that is not known until it is rendered may be the one that the reference means
				return name.isDynamicValue || getDOMValue(name) === targetName;
			});

			if (!target) {
				report({
					scope: usemapAttr,
					line: usemapAttr.valueNode?.startLine,
					col: usemapAttr.valueNode?.startCol,
					raw: usemapAttr.valueNode?.raw,
					message: t(
						'The "{0*}" attribute of the "{1*}" element must be a valid hash-name reference to a "{2*}" element',
						'usemap',
						'img',
						'map',
					),
				});
			}
		});
	},
});
