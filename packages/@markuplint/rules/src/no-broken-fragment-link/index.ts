import { createRule } from '@markuplint/ml-core';
import { decodeEntities, decodeHref } from '@markuplint/shared';

import meta from './meta.js';

/** CSS selector matching hyperlink elements that have an `href` attribute. */
const HYPERLINK_SELECTOR = 'a[href], area[href]';

/**
 * Split out of the former `no-refer-to-non-existent-id` rule. Unlike the
 * `DOMID`-typed attributes and ARIA ID references that rule covers, HTML LS
 * does not treat a broken hyperlink fragment as a conformance violation —
 * scrolling to a fragment simply does nothing when its target is absent
 * (§ Scrolling to a fragment). Reporting it is still useful (almost always
 * an author mistake), which is why the default severity stays `warning`
 * rather than `no-refer-to-non-existent-id`'s `error`.
 *
 * @see https://html.spec.whatwg.org/multipage/browsing-the-web.html#scrolling-to-a-fragment
 */
export default createRule({
	meta: meta,
	defaultSeverity: 'warning',
	defaultOptions: {
		fragmentRefersNameAttr: false,
	},
	async verify({ document, report, t }) {
		const idList = new Set<string>();
		const nameList = new Set<string>();
		let hasDynamicId = false;
		let hasDynamicName = false;

		const isMutable = document.nodeList.some(node => node.is(node.MARKUPLINT_PREPROCESSOR_BLOCK));

		if (isMutable) {
			return;
		}

		for (const el of document.querySelectorAll('[id]')) {
			const attr = el.getAttributeNode('id');
			if (!attr) {
				continue;
			}
			if (attr.isDynamicValue) {
				hasDynamicId = true;
			}
			if (attr.valueType !== 'code') {
				idList.add(decodeEntities(attr.value));
			}
		}

		if (hasDynamicId) {
			return;
		}

		for (const el of document.querySelectorAll('[name]')) {
			const attr = el.getAttributeNode('name');
			if (!attr) {
				continue;
			}
			if (attr.isDynamicValue) {
				hasDynamicName = true;
			}
			if (attr.valueType !== 'code') {
				nameList.add(decodeEntities(attr.value));
			}
		}

		await document.walkOn('Element', el => {
			if (el.rule.options.fragmentRefersNameAttr && hasDynamicName) {
				return;
			}

			if (!el.matches(HYPERLINK_SELECTOR)) {
				return;
			}

			const href = el.getAttributeNode('href');

			if (!href) {
				return;
			}

			const rawFragment = href.value.match(/^#(.+)/)?.[1];

			if (rawFragment == null) {
				return;
			}

			const decodedFragment = decodeHref(rawFragment);

			// > 2. If fragment is the empty string, then return the special value top of the document.
			// >
			// > 9. If decodedFragment is an ASCII case-insensitive match for the string top, then return the top of the document.
			if (decodedFragment === '' || /^top$/i.test(decodedFragment)) {
				return;
			}

			if (
				!idList.has(decodedFragment) &&
				(el.rule.options.fragmentRefersNameAttr ? !nameList.has(decodedFragment) : true)
			) {
				report({
					scope: href,
					line: href.valueNode?.startLine,
					col: href.valueNode?.startCol,
					raw: href.valueNode?.raw,
					message: t('Missing {0}', t('"{0*}" ID', decodedFragment)),
				});
			}
		});
	},
});
