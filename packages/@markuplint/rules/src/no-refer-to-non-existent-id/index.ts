import type { ARIAVersion } from '@markuplint/ml-spec';

import { createRule, getAttrSpecs, ariaSpecs } from '@markuplint/ml-core';
import { ARIA_RECOMMENDED_VERSION } from '@markuplint/ml-spec';
import { decodeEntities, decodeHref } from '@markuplint/shared';

import meta from './meta.js';

const HYPERLINK_SELECTOR = 'a[href], area[href]';

export default createRule({
	meta: meta,
	defaultOptions: {
		ariaVersion: ARIA_RECOMMENDED_VERSION as ARIAVersion,
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

		await document.walkOn('Attr', attr => {
			const attrSpec = getAttrSpecs(attr.ownerElement, document.specs);

			if (!attrSpec) {
				return;
			}

			if (attr.isDynamicValue) {
				return;
			}

			const name = attr.name;

			if (name.toLowerCase() === 'id') {
				return;
			}

			const value = attr.value;

			const spec = attrSpec.find(s => s.name === name);

			if (spec) {
				// DOMID and DOMID List do not become in the array type.
				if (Array.isArray(spec.type)) {
					return;
				}

				if (spec.type === 'DOMID' && !idList.has(value)) {
					report({
						scope: attr,
						line: attr.valueNode?.startLine,
						col: attr.valueNode?.startCol,
						raw: attr.valueNode?.raw,
						message: t('Missing {0}', t('"{0*}" ID', value)),
					});
				}

				if (typeof spec.type !== 'string' && 'token' in spec.type && spec.type.token === 'DOMID') {
					const refs = value
						.split(spec.type.separator === 'space' ? /\s/ : ',')
						.map(id => id.trim())
						.filter(Boolean);

					for (const ref of refs) {
						if (!idList.has(ref)) {
							report({
								scope: attr,
								line: attr.valueNode?.startLine,
								col: attr.valueNode?.startCol,
								raw: attr.valueNode?.raw,
								message: t('Missing {0}', t('"{0*}" ID', ref)),
							});
						}
					}
				}
			}

			const { props } = ariaSpecs(document.specs, attr.rule.options.ariaVersion);

			const aria = props.find(prop => prop.name === name);
			if (aria) {
				if (aria.value === 'ID reference' && !idList.has(value)) {
					report({
						scope: attr,
						line: attr.valueNode?.startLine,
						col: attr.valueNode?.startCol,
						raw: attr.valueNode?.raw,
						message: t('Missing {0}', t('"{0*}" ID', value)),
					});
				} else if (aria.value === 'ID reference list') {
					const refs = value
						.split(/\s/)
						.map(id => id.trim())
						.filter(Boolean);

					for (const ref of refs) {
						if (!idList.has(ref)) {
							report({
								scope: attr,
								line: attr.valueNode?.startLine,
								col: attr.valueNode?.startCol,
								raw: attr.valueNode?.raw,
								message: t('Missing {0}', t('"{0*}" ID', ref)),
							});
						}
					}
				}
			}
		});

		/**
		 * @see https://html.spec.whatwg.org/multipage/browsing-the-web.html#scrolling-to-a-fragment
		 */
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
